#!/usr/bin/env python3
"""Regenerate the screenshots in docs/screenshots/, which README.md and readme-for-llm.md show.

Starts the real server on a throwaway database, fills it with twelve days of Sad to Savage (the same data
scripts/demo-server.py logs), and captures the pages with the same headless Chrome the tests use:

    pip install -r tests/requirements.txt
    python scripts/make-screenshots.py

It needs Chrome, Chromium or Edge (see tests/README.md) and never touches data/.
The demo data is made from the plan, so running it again only changes the pictures when the app itself looks
different (the dates move with the day it is run).
"""

import base64
import importlib.util
import os
import shutil
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from tests.harness import LIGHT_DEVICE, AppServer, Chrome  # noqa: E402

OUT_DIR = os.path.join(ROOT, 'docs', 'screenshots')
DESKTOP = (1280, 800)
PHONE = (390, 844)


def load_demo():
    """scripts/demo-server.py as a module (its name has a hyphen), for the twelve days of training it logs."""
    spec = importlib.util.spec_from_file_location('demo_server', os.path.join(ROOT, 'scripts', 'demo-server.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def shrink(path):
    """Recompress the PNG losslessly when Pillow is installed (it is for make-icons.py); skip it otherwise."""
    try:
        from PIL import Image
    except ImportError:
        return
    with Image.open(path) as image:
        image.load()
    image.save(path, optimize=True)


class Browser:
    def __init__(self, server, workdir):
        self.chrome = Chrome(os.path.join(workdir, 'profile'))
        self.cdp = self.chrome.connect(server.base_url)
        for domain in ('Page', 'Runtime', 'Network'):
            self.cdp.send(f'{domain}.enable')
        self.cdp.send('Emulation.setScrollbarsHidden', hidden=True)
        # The app follows the device's light or dark mode; the screenshots are light (the dark one sets it outright),
        # whatever this machine uses. Motion is reduced, so the demo data's best streak does not fire its confetti across the page
        # being photographed.
        self.cdp.send('Emulation.setEmulatedMedia', features=[*LIGHT_DEVICE, {'name': 'prefers-reduced-motion', 'value': 'reduce'}])

    def viewport(self, size, phone=False):
        width, height = size
        self.cdp.send('Emulation.setDeviceMetricsOverride', width=width, height=height,
                      deviceScaleFactor=2, mobile=phone)

    def open(self, path, ready):
        self.cdp.goto(path)
        if not self.cdp.wait(ready, timeout=15):
            raise RuntimeError(f'{path} never became ready ({ready})')
        self.cdp.pause(0.8)  # transitions, fonts, the chart

    def edge(self, selector, side='bottom', index=0, margin=0):
        """Where an element's top or bottom sits on the page, in CSS pixels, plus a margin."""
        rect = f"document.querySelectorAll({selector!r})[{index}].getBoundingClientRect()"
        return self.cdp.ev(f'{rect}.{side} + window.scrollY') + margin

    def save(self, name, top=None, bottom=None):
        """The viewport, or the full-width slice of the page between top and bottom (CSS pixels)."""
        params = {'format': 'png'}
        if bottom is not None:
            top = max(0, top or 0)
            width = self.cdp.ev('document.documentElement.clientWidth')
            params.update(captureBeyondViewport=True,
                          clip={'x': 0, 'y': top, 'width': width, 'height': bottom - top, 'scale': 1})
        data = base64.b64decode(self.cdp.send('Page.captureScreenshot', **params)['result']['data'])
        path = os.path.join(OUT_DIR, name)
        with open(path, 'wb') as handle:
            handle.write(data)
        shrink(path)
        print(f'  {os.path.relpath(path, ROOT)}  ({os.path.getsize(path) // 1024} KB)')

    def close(self):
        self.cdp.close()
        self.chrome.stop()


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    workdir = tempfile.mkdtemp(prefix='workout-screenshots-')
    server = browser = None
    try:
        demo = load_demo()
        server = AppServer(os.path.join(workdir, 'demo.db'))
        _, cookie = server.api('POST', '/api/auth/register', {'username': 'alex', 'email': 'alex@example.test', 'password': 'demo-password'})
        token = cookie.split('session=')[1].split(';')[0]
        workouts, program = demo.demo_training()
        for workout in workouts:
            server.api('POST', '/api/workouts', workout, token)
        server.api('PUT', '/api/state', {'program': program}, token)

        browser = Browser(server, workdir)
        cdp = browser.cdp
        cdp.send('Network.setCookie', name='session', value=token, domain='127.0.0.1', path='/')
        today_ready = "document.querySelectorAll('#programNext button').length >= 1 && initialLoadDone === true"
        print(f'Writing {os.path.relpath(OUT_DIR, ROOT)}/')

        # Today on a wide screen: the next day, the walk, and the six weeks folded under them.
        browser.viewport(DESKTOP)
        browser.open('/index.html', today_ready)
        browser.save('today.png', bottom=browser.edge('#programCard', margin=24))

        # The six weeks opened, on a phone: each day with its walk.
        browser.viewport(PHONE, phone=True)
        browser.open('/index.html', today_ready)
        cdp.ev("document.querySelector('#programCard .program-section').open = true")
        cdp.pause(0.4)
        browser.save('weeks.png', top=browser.edge('#programWalk', margin=12), bottom=browser.edge('#programWeeks', margin=12))

        # A strength day in progress on a phone: the warm-up circuit done as rounds, the rest timer running.
        cdp.ev("document.querySelector('#programNext [data-program-action=start]').click()")
        cdp.pause(0.5)
        for _ in range(4):
            cdp.ev("document.getElementById('completedReps').value = '10'; document.getElementById('completeSetBtn').click()")
            cdp.pause(0.4)
        cdp.pause(1.2)
        browser.save('active-workout.png', top=browser.edge('#activeWorkout', 'top', margin=-16), bottom=browser.edge('#activeWorkout', margin=16))

        # Settings on a phone.
        cdp.ev("window.scrollTo(0, 0); document.getElementById('settingsButton').click()")
        cdp.pause(0.5)
        browser.save('settings.png')
        cdp.ev("document.getElementById('closeSettings').click()")
        cdp.ev("confirm = () => true; document.getElementById('endWorkoutBtn').click()")
        cdp.pause(0.5)

        # A Pilates day: the program with only its first day done, so the next is the mat session, with its timer at 25:00.
        server.api('PUT', '/api/state', {'program': {**program, 'done': {'0-0': program['done']['0-0']}}}, token)
        browser.open('/index.html', today_ready)
        cdp.ev("document.querySelector('#programNext [data-program-action=start]').click()")
        cdp.pause(0.6)
        browser.save('pilates.png', top=browser.edge('#activeWorkout', 'top', margin=-16), bottom=browser.edge('#activeWorkout', margin=16))
        cdp.ev("confirm = () => true; document.getElementById('endWorkoutBtn').click()")
        cdp.pause(0.3)

        # Progress, every workout on one chart (it opens on the most logged exercise, so all of them are asked for).
        browser.viewport(DESKTOP)
        browser.open('/progress.html?exercise=all', "document.querySelectorAll('#legend .legend-item').length >= 3")
        browser.save('progress.png', bottom=browser.edge('main .card', margin=40))

        # History in dark mode, down to the end of the second workout, both opened.
        server.api('PUT', '/api/state', {'settings': {'theme': 'dark'}}, token)
        browser.open('/history.html', "document.documentElement.dataset.theme === 'dark' && document.querySelectorAll('.history-workout').length >= 5")
        # Each workout is a line until tapped; the first two are opened to show their sets.
        cdp.ev("[...document.querySelectorAll('.history-workout [data-action=view]')].slice(0, 2).forEach(button => button.click())")
        browser.save('history-dark.png', bottom=browser.edge('.history-workout', index=1, margin=1))
    finally:
        if browser:
            browser.close()
        if server:
            server.stop()
        time.sleep(0.5)
        shutil.rmtree(workdir, ignore_errors=True)


if __name__ == '__main__':
    main()
