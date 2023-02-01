const fs = require('fs');
const chalk = require('chalk');
const puppeteer = require('puppeteer');

const arg = process.argv;
const url = arg[2];
const region = arg[3]?.toLocaleLowerCase();

const elements = {
  price: '.Price_price__B1Q8E',
  oldPrice: '.BuyQuant_root___ZjRq .Price_role_old__qW2bx',
  rating: '[itemprop="ratingValue"]',
  reviewCount: '.Summary_reviewsCountContainer__4GijP .Summary_title__Uie8u',
};

if (url && region) {
  (async function () {
    const browser = await puppeteer.launch({ headless: false, args: ['--start-maximized'] });
    const page = await browser.newPage();

    await page.setViewport({ width: 0, height: 0 });
    await page.goto(url);
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // выбор региона
    try {
      await page.click('.FirstHeader_region__lHCGj').catch(() => {
        console.log(chalk.red('ошибка при открытии модального окна'));
        throw new Error();
      });

      await page.waitForSelector('.RegionModal_item___fYU6', { visible: true }).catch(() => {
        console.log(chalk.red('ошибка ожидания списка регионов'));
        throw new Error();
      });

      await page.evaluate((propRegion) => {
        const regions = document.querySelectorAll('.RegionModal_item___fYU6');

        regions?.forEach((el) => {
          const isRegion = el.textContent?.toLocaleLowerCase().includes(propRegion);
          if (isRegion) el.click();
        });
      }, region);

      await page.waitForNavigation();
    } catch (e) {
      if (e instanceof puppeteer.TimeoutError) {
        console.log(chalk.red('регион не найден'));
      } else {
        console.log(chalk.red('ошибка выбора региона'));
      }
    }

    // сбор и запись данных в файл
    const getTextBySelector = async (selector) => {
      const element = await page.$(selector);
      if (element) {
        const text = await (await element.getProperty('textContent')).jsonValue();
        return text;
      }
      return null;
    };

    const results = [];
    Object.entries(elements).forEach(([key, selector]) => {
      results.push(getTextBySelector(selector).then((value) => `${key}=${value}`));
    });
    const values = await Promise.all(results);
    fs.writeFile('product.txt', values.join('\n'), () => {});

    await page.screenshot({ path: 'screenshot.jpg', fullPage: true });
    await browser.close();
    console.log(chalk.green('скрипт выполнен'));
  }());
} else {
  throw new Error('укажите параметры url & region');
}
