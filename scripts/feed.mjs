// Fetches the newest grafikolabs Dribbble shots and writes feed.json.
// Runs daily via GitHub Actions so the hub tiles stay fresh automatically.
import { writeFileSync, readFileSync, existsSync } from 'fs'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
let feed = { instagram: [], dribbble: [] }
if (existsSync('feed.json')) feed = JSON.parse(readFileSync('feed.json', 'utf8'))

try {
  const res = await fetch('https://dribbble.com/grafikolabs', { headers: { 'user-agent': UA } })
  const html = await res.text()
  const urls = [...new Set(
    (html.match(/https:\/\/cdn\.dribbble\.com\/userupload\/[^"'\s\\)]+\.(?:png|jpe?g|webp)[^"'\s\\)]*/g) || [])
      .map(u => u.split('?')[0])
  )].slice(0, 4).map(u => u + '?resize=400x300&vertical=center')
  if (urls.length >= 2) feed.dribbble = urls
  console.log('dribbble shots:', urls.length)
} catch (e) {
  console.log('dribbble fetch failed, keeping previous feed:', e.message)
}

writeFileSync('feed.json', JSON.stringify(feed, null, 1))
console.log('feed.json written')
