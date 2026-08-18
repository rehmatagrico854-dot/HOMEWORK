# Homework

A personal day-to-day activity and work management app, built with Apache Cordova, HTML5, CSS3, and vanilla JavaScript. All data is stored locally on the device using `localStorage` — no server, login, or internet connection required.

## Features

- Add, edit, and delete tasks
- Categories: Study, Work, Personal, Chores, Other
- Priority levels: Low, Medium, High
- Optional due date and due time, with automatic overdue detection
- Filter by status (All / Active / Completed / Overdue) and category
- Sort by due date, priority, creation date, or title
- Live stats bar (total, active, done, overdue)
- Fully offline, no external dependencies at runtime

## Building the APK automatically (GitHub Actions)

Push to `main` and the workflow in `.github/workflows/build-apk.yml` builds the APK automatically. You can also trigger it manually from the Actions tab. Download the finished APK from the run's Artifacts section.

## Building locally (optional)

```bash
npm install
npm install -g cordova
npx cordova platform add android
npx cordova build android --release
```

## Notes

- Application ID: `com.homework.daily`
- Application name: `Homework`
- Minimum Android SDK: 24, Target SDK: 34
