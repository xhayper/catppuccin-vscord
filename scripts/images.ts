import { readdir, unlink, writeFile } from 'node:fs/promises'
import { type Variants, variants } from '@catppuccin/palette'
import { ensureDir, remove } from 'fs-extra'
import { join, resolve } from 'pathe'
import { launch } from 'puppeteer'
import consola from 'consola'
import { catppuccinVariants } from '@/palettes'

const THEMES = resolve('themes')
const IMAGES = resolve('images')

// <ICON_NAME, VSCORD_ICON_NAME>
const IMAGE_NAME_OVERRIDE: Record<string, string> = {
  astro_config: 'astroconfig',
  bash: 'shell',
  coffeescript: 'coffee',
  css_map: 'cssmap',
  database: 'sql',
  javascript: 'js',
  javascript_map: 'jsmap',
  javascript_react: 'jsx',
  markdown_mdx: 'markdownx',
  txt: 'text',
  typescript: 'ts',
  typescript_react: 'tsx',
  typescript_def: 'typescript-def',
  vs_codium: 'vscodium',
  vs_code: 'vscode',
  vs_code_ignore: 'vscodeignore',
  vue_config: 'vueconfig',
}

const generateHtml = (icon: string, flavor: keyof Variants<any>) =>
  `
    <html>
      <body style="font-family: sans-serif; font-size: 14px; margin: 0px">
        <div style="background-color: ${variants[flavor].mantle.hex}; display: flex; align-items: center; justify-content: center; width: 512px; height: 512px;">
          <img style="width: 256px;" src="../../themes/${flavor}/icons/${icon}" />
        </div>
      </body>
    </html>
  `

await remove(IMAGES)
await ensureDir(IMAGES)
const icons = await readdir(join(THEMES, 'mocha', 'icons'))

const [_, fileIcons] = icons.reduce(
  (acc, cur) =>
    cur.startsWith('folder')
      ? (cur.endsWith('open.svg') || cur.endsWith('root.svg'))
          ? acc
          : [[...acc[0], cur], acc[1]]
      : [acc[0], [...acc[1], cur]],
  [[], []],
)

consola.info('Building images...')
await Promise.all(
  catppuccinVariants.map(async (flavor) => {
    for (const icon of fileIcons) {
      const imageName = icon.replace('.svg', '')
      const IMAGE_FOLDER = resolve(IMAGES, flavor)
      consola.info('Building', flavor, 'flavored', imageName, 'icon')
      const IMAGE_PREVIEW = join(IMAGE_FOLDER, `${flavor}.html`)
      await ensureDir(IMAGE_FOLDER)
      await writeFile(IMAGE_PREVIEW, generateHtml(icon, flavor))
      const browser = await launch()
      const page = await browser.newPage()
      await page.setViewport({ height: 512, width: 512 })
      await page.goto(join('file:', IMAGE_PREVIEW))
      await page.screenshot({
        path: join(
          IMAGES,
          `${flavor}/${IMAGE_NAME_OVERRIDE[imageName] ?? imageName}.png`,
        ),
        fullPage: true,
        omitBackground: true,
      })
      await browser.close()
      await unlink(IMAGE_PREVIEW)
    }
  }),
)

consola.success(
  `Built ${catppuccinVariants.length * fileIcons.length} images successfully!`,
)
