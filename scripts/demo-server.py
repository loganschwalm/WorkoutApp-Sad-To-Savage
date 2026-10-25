#!/usr/bin/env python3
"""Serve the app locally with twelve days of Sad to Savage already done, and a walk on each, to try it on realistic data:

    python scripts/demo-server.py             this checkout, until Ctrl+C
    python scripts/demo-server.py --follow    whatever CI last passed, rebuilt each time it passes again

Then open http://localhost:6769/ and sign in as savage-test / Sad-To-Savage-Test. Every start is a fresh database,
so whatever is logged in it is gone at the next one; data/workouts.db is never touched.

--follow keeps its own clone of the repository in data/preview and checks every minute whether `stable` has moved,
which it does once every test has passed on a push to main (.github/workflows/tests.yml). When it has, the clone
updates, the server restarts on the new code, and the training is logged again. `--branch main` rebuilds on every
push instead, whether its tests passed or not.
"""

import argparse
import contextlib
import http.client
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEW_DIR = os.path.join(ROOT, 'data', 'preview')
USERNAME, EMAIL, PASSWORD = 'savage-test', 'savage-test@example.com', 'Sad-To-Savage-Test'
DAY_MS = 86400000

# ---- Twelve days of Sad to Savage ---------------------------------------------------------------------------------
# Built as the app builds them (sadToSavageStrength and sadToSavagePilates in program-definitions.js, finishWorkout in
# active-workout.js) from the plan itself, frontend/sad-to-savage-data.js: the warm-up circuit as warm-up sets, each
# superset as rounds at a weight in the middle of the level's range, and the cool-down as a timed set. The lifter is
# new to strength, and has been on the program every day for twelve days, walking a little further as it went.
LEVEL = 'nts'
DONE = 12
NOTES = {2: 'Hinges felt good today.', 6: 'Pull-ups on the heavy band, tough but done.', 9: 'Short on time, kept the rests to a minute.'}


def load_plan():
    """The plan as data: sad-to-savage-data.js is a JavaScript object literal of a plain kind (single-quoted strings,
    unquoted keys, trailing commas), so it is turned into JSON rather than read from a second copy of the plan here."""
    with open(os.path.join(ROOT, 'frontend', 'sad-to-savage-data.js'), encoding='utf-8') as handle:
        text = handle.read()
    body = text[text.index('const sadToSavagePlan = ') + len('const sadToSavagePlan = '):].strip().rstrip(';')
    out, i = [], 0
    while i < len(body):
        char = body[i]
        if char == "'":
            j, chars = i + 1, []
            while body[j] != "'":
                if body[j] == '\\':
                    chars.append(body[j + 1])
                    j += 2
                else:
                    chars.append(body[j])
                    j += 1
            out.append(json.dumps(''.join(chars)))
            i = j + 1
        elif char.isalpha():
            j = i
            while body[j].isalnum():
                j += 1
            out.append(json.dumps(body[i:j]) if body[j] == ':' else body[i:j])
            i = j
        else:
            out.append(char)
            i += 1
    return json.loads(re.sub(r',(\s*[\]}])', r'\1', ''.join(out)))


def weight_in(text):
    """A weight in the middle of a range such as '7.5-10lb DBs', to a half; 0 for a band, a bench or body weight."""
    match = re.match(r'^([\d.]+)(?:-([\d.]+))?\s*(?:lbs?|\(total\))', text or '')
    if not match:
        return 0
    low, high = float(match.group(1)), float(match.group(2) or match.group(1))
    return round((low + high) / 2 * 2) / 2


def strength_exercises(day, rest=90):
    """A strength day as finishWorkout saves it: each move's sets, in the order they were done, as rounds."""
    exercises = []
    for move in day['warmup']['moves']:
        sets = [{'weight': 0, 'reps': move['reps'], 'type': 'warmup'} for _ in range(day['warmup']['rounds'])]
        exercises.append({'name': move['name'], 'weight': 0, 'reps': move['reps'], 'sets': sets, 'rest': rest, 'group': 'warmup'})
    for number, block in enumerate(day['blocks'], 1):
        for move in block['moves']:
            weight = weight_in(move.get(LEVEL))
            sets = [{'weight': weight, 'reps': move.get('repsMax', move['reps'])} for _ in range(block['rounds'])]
            exercises.append({'name': move['name'], 'weight': weight, 'reps': sets[-1]['reps'], 'sets': sets, 'rest': rest, 'group': f'block{number}',
                              **({'timed': True} if move.get('unit') == 'seconds' else {})})
    return exercises


def timed_exercise(name, seconds, rest=90):
    return {'name': name, 'weight': 0, 'reps': seconds, 'sets': [{'weight': 0, 'reps': seconds}], 'rest': rest, 'timed': True}


def demo_training():
    """The workouts, oldest first, one a day until yesterday; and the program as they leave it, with a walk a day."""
    plan = load_plan()['days'][:DONE]
    today_noon = time.mktime(time.localtime()[:3] + (12, 0, 0, 0, 0, -1)) * 1000
    workouts, done, walks = [], {}, {}
    for index, day in enumerate(plan):
        created = int(today_noon - (len(plan) - index) * DAY_MS - 5 * 3600 * 1000)
        if day['kind'] == 'pilates':
            exercises = [timed_exercise(f"Mat Pilates: {day['focus']}", day['minutes'] * 60), timed_exercise('Cool-down', 240)]
            duration = day['minutes'] * 60 + 240 + 120
        else:
            exercises = strength_exercises(day) + [timed_exercise('Cool-down', 240)]
            duration = 2700 + index * 60
        workouts.append({
            'name': f"{day['id']} {day['focus']}", 'notes': NOTES.get(index, ''), 'exercises': exercises, 'createdAt': created,
            'clientId': f'demo-sad-to-savage-{index}', 'unit': 'lbs', 'duration': duration,
            'program': {'name': 'Sad to Savage', 'cycle': 1, 'week': day['week'], 'label': f"Week {day['week']} of 6"},
        })
        done[f"{day['week'] - 1}-{day['day'] - 1}"] = {'at': created, 'skipped': False}
        # A little further as the days go by, and one day with nothing to count but showing up.
        key = time.strftime('%Y-%m-%d', time.localtime(created / 1000))
        walks[key] = ({'at': created + 3600000, 'steps': 0, 'distance': 0, 'unit': 'mi'} if index == 5 else
                      {'at': created + 3600000, 'steps': 7000 + index * 310, 'distance': round(3.0 + index * 0.13, 2), 'unit': 'mi'})
    program = {'definition': 'sad-to-savage', 'startedAt': workouts[0]['createdAt'], 'cycle': 1, 'options': {'level': LEVEL}, 'done': done, 'walks': walks}
    return workouts, program


# ---- The server ---------------------------------------------------------------------------------------------------

class DemoServer:
    """backend/server.py from app_dir on a fresh database, with the demo account signed up and its training logged."""

    def __init__(self, app_dir, port, db_path, log_path):
        with socket.socket() as probe:
            probe.settimeout(0.5)
            if probe.connect_ex(('127.0.0.1', port)) == 0:
                raise RuntimeError(f'something is already listening on port {port}: stop it, or pass --port')
        for suffix in ('', '-wal', '-shm'):
            with contextlib.suppress(FileNotFoundError):
                os.remove(db_path + suffix)
        self.port, self.log_path = port, log_path
        env = dict(os.environ, PORT=str(port), WORKOUT_DB=db_path, APP_ROOT=os.path.join(app_dir, 'frontend'),
                   ALLOW_REGISTRATION='1', PYTHONUNBUFFERED='1')
        self.log = open(log_path, 'w', encoding='utf-8')
        self.process = subprocess.Popen([sys.executable, os.path.join(app_dir, 'backend', 'server.py')], env=env,
                                        stdout=self.log, stderr=subprocess.STDOUT)
        try:
            self._await_ready()
            self._log_training()
        except BaseException:
            self.stop()
            raise

    def api(self, method, path, body=None, token=None):
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=10)
        headers = {'Content-Type': 'application/json', **({'Cookie': f'session={token}'} if token else {})}
        conn.request(method, path, json.dumps(body) if body is not None else None, headers)
        response = conn.getresponse()
        data = response.read()
        conn.close()
        if response.status >= 400:
            raise RuntimeError(f'{method} {path} answered {response.status}: {data.decode(errors="replace")}')
        return json.loads(data) if data else None, response.getheader('Set-Cookie')

    def _await_ready(self):
        deadline = time.time() + 20
        while time.time() < deadline:
            if self.process.poll() is not None:
                raise RuntimeError(f'the server exited with code {self.process.returncode}; see {self.log_path}')
            try:
                self.api('GET', '/api/auth/me')
                return
            except OSError:
                time.sleep(0.2)
        raise RuntimeError(f'the server did not answer on port {self.port} within 20 seconds; see {self.log_path}')

    def _log_training(self):
        _, cookie = self.api('POST', '/api/auth/register', {'username': USERNAME, 'email': EMAIL, 'password': PASSWORD})
        token = cookie.split('session=')[1].split(';')[0]
        workouts, program = demo_training()
        for workout in workouts:
            self.api('POST', '/api/workouts', workout, token)
        self.api('PUT', '/api/state', {'program': program}, token)

    def stop(self):
        if self.process.poll() is None:
            self.process.terminate()
            self.process.wait(timeout=15)
        self.log.close()


def stamp():
    return time.strftime('%H:%M:%S')


def announce(server, commit):
    print(f'{stamp()} Serving {commit} at http://localhost:{server.port}/ - sign in as {USERNAME} / {PASSWORD}')


def git(*args, cwd=ROOT):
    return subprocess.run(['git', *args], cwd=cwd, check=True, capture_output=True, text=True, timeout=300).stdout.strip()


# ---- Following CI -------------------------------------------------------------------------------------------------

def remote_head(repo, branch):
    """The commit the branch is on now, or None while it cannot be asked (no network, say)."""
    try:
        listing = git('ls-remote', repo, f'refs/heads/{branch}')
    except (OSError, subprocess.SubprocessError):
        return None
    return listing.split()[0] if listing else None


def check_out(repo, branch, clone):
    """The clone at the branch's newest commit, fetched afresh; returns that commit."""
    if not os.path.isdir(os.path.join(clone, '.git')):
        shutil.rmtree(clone, ignore_errors=True)
        git('clone', '--quiet', '--depth', '1', '--branch', branch, repo, clone)
    else:
        git('remote', 'set-url', 'origin', repo, cwd=clone)
        git('fetch', '--quiet', '--force', '--depth', '1', 'origin', branch, cwd=clone)
        git('checkout', '--quiet', '--force', '--detach', 'FETCH_HEAD', cwd=clone)
        git('clean', '--quiet', '-fdx', cwd=clone)
    return git('rev-parse', 'HEAD', cwd=clone)


def follow(args):
    clone = os.path.join(PREVIEW_DIR, 'app')
    db_path, log_path = os.path.join(PREVIEW_DIR, 'workouts.db'), os.path.join(PREVIEW_DIR, 'server.log')
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    server = served = None
    print(f'Following {args.branch} on {args.repo}, checking every {args.interval} seconds. Ctrl+C stops.')
    try:
        while True:
            head = remote_head(args.repo, args.branch)
            if head and head != served:
                if server:
                    server.stop()
                    server = None
                try:
                    served = check_out(args.repo, args.branch, clone)
                    server = DemoServer(clone, args.port, db_path, log_path)
                    announce(server, git('log', '-1', '--format=%h %s', cwd=clone))
                except (OSError, RuntimeError, subprocess.SubprocessError) as error:
                    # Tried again at the next check, so a busy port or a dropped connection sorts itself out.
                    served = None
                    print(f'{stamp()} Could not serve {head[:7]}: {error}')
            time.sleep(args.interval)
    except KeyboardInterrupt:
        pass
    finally:
        if server:
            server.stop()


def serve_checkout(args):
    workdir = tempfile.mkdtemp(prefix='workout-demo-')
    try:
        server = DemoServer(ROOT, args.port, os.path.join(workdir, 'workouts.db'), os.path.join(workdir, 'server.log'))
        try:
            announce(server, f'{git("log", "-1", "--format=%h %s")} (this checkout, with any uncommitted changes)')
            server.process.wait()
        except KeyboardInterrupt:
            pass
        finally:
            server.stop()
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


def main():
    # Commit subjects can hold characters a Windows console cannot show; they print as ? rather than stopping it.
    sys.stdout.reconfigure(line_buffering=True, errors='replace')
    parser = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    parser.add_argument('--follow', action='store_true', help='serve what CI last passed, and rebuild when it passes again')
    parser.add_argument('--branch', default='stable', help='the branch --follow serves (default: stable)')
    parser.add_argument('--repo', help="the repository --follow clones (default: this checkout's origin)")
    parser.add_argument('--port', type=int, default=6769, help='the port to serve on (default: 6769)')
    parser.add_argument('--interval', type=int, default=60, help='seconds between checks with --follow (default: 60)')
    args = parser.parse_args()
    if args.follow:
        args.repo = args.repo or git('remote', 'get-url', 'origin')
        follow(args)
    else:
        serve_checkout(args)


if __name__ == '__main__':
    main()
