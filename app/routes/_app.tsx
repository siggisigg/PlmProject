import { define } from '../utils.ts'

export default define.page(function AppShell({ Component }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Samey PLM</title>
      </head>
      <body style="margin:0;background:#0f1117">
        <Component />
      </body>
    </html>
  )
})
