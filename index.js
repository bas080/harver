#!/usr/bin/env node

import blend from '@mapbox/blend'
import fetch from 'node-fetch'
import minimist from 'minimist'
import { join } from 'path'
import { promises as fs } from 'fs'
import { URL } from 'url'
import { promisify } from 'util'
const argv = {
  output: 'cat.jpg',
  greeting: 'Hello',
  who: 'You',
  width: 400,
  height: 500,
  color: 'Pink',
  size: 100,
  ...minimist(process.argv.slice(2))
}

function caasURLString ({ says, width, height, color, size }) {
  const url = new URL(`/cat/says/${encodeURIComponent(says)}`, 'https://cataas.com')

  url.search = new URLSearchParams({
    width,
    height,
    color,
    s: size
  })

  return url.toString()
}

const pBlend = promisify(blend)
const main = async (argv) => {
  const { height, width, who, greeting, output } = argv
  const fileOut = join(process.cwd(), output)

  const images = await Promise.all([
    fetch(caasURLString({ ...argv, says: greeting })).then(x => x.buffer()),
    fetch(caasURLString({ ...argv, says: who })).then(x => x.buffer())
  ])

  const data = await pBlend([{
    buffer: images[0],
    x: 0,
    y: 0
  }, {
    buffer: images[1],
    x: width,
    y: 0
  }], {
    width: width * 2,
    height: height,
    format: 'jpeg'
  })

  await fs.writeFile(fileOut, data, 'binary')

  console.log(fileOut)
}

main(argv)
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
