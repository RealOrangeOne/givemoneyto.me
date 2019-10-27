import { readFileSync, writeFileSync } from 'fs';
import glob from 'glob';
import Handlebars from 'handlebars';
import jsyaml from 'js-yaml';
import mkdirp from 'mkdirp';
import Bundler from 'parcel-bundler';
import { dirname, join } from 'path';
import ProgressBar from 'progress';
import rimraf from 'rimraf';
import { mapObject, range } from 'underscore';

interface Account {
  image: string;
  link: string;
}

interface Redirect {
  src: string;
  dest: string;
}

const BUILD_DIR = join(__dirname, 'build');
const SRC_DIR = join(__dirname, 'src');
const PROGRESS_BAR_FORMAT = '[:bar] :rate/ps :percent :current/:total';
const MAX_VALUE = process.env.MAX_VALUE
  ? parseInt(process.env.MAX_VALUE, 10)
  : 2;
const BUNDLER_OPTIONS = {
  outDir: BUILD_DIR,
  watch: false,
  minify: true,
};
const NEW_LINES_RE = /(\r\n|\n|\r)/gm;

function readAccounts(): ReadonlyArray<Account> {
  const rawAccounts: object = jsyaml.safeLoad(
    readFileSync(join(__dirname, 'accounts.yml')).toString()
  );
  return Object.values(
    mapObject(rawAccounts, (val, key) => {
      return {
        ...val,
        name: key,
      };
    })
  );
}

function statusOutput(message: string) {
  console.log('> ' + message + '...');
}

function isPrecision(value: number, precision: number) {
  return value.toFixed(precision) === value.toString();
}

function writeTemplate(
  template: HandlebarsTemplateDelegate,
  value: string,
  context: any
) {
  const outputFile = join(BUILD_DIR, value, 'index.html');
  mkdirp.sync(dirname(outputFile));
  writeFileSync(
    outputFile,
    template({
      ...context,
      outputUrl: encodeURIComponent(`https://givemoneyto.me/${value}/`),
    }).replace(NEW_LINES_RE, '')
  );
}

function writeRedirects(redirects: ReadonlyArray<Redirect>) {
  const template = Handlebars.compile(
    readFileSync(join(SRC_DIR, 'redirects.txt')).toString()
  );
  writeFileSync(join(BUILD_DIR, '_redirects'), template({ redirects }));
}

function humanize(value: number) {
  if (isPrecision(value, 0)) {
    return value.toString();
  }
  return value.toFixed(2);
}

(async function() {
  rimraf.sync(BUILD_DIR);

  statusOutput('Reading accounts');
  const accounts = readAccounts();

  statusOutput('Creating template');
  const bundler = new Bundler(join(SRC_DIR, 'template.html'), BUNDLER_OPTIONS);
  await bundler.bundle();

  statusOutput('Compiling HTML template');
  Handlebars.registerPartial(
    'accounts',
    readFileSync(join(SRC_DIR, 'accounts.html')).toString()
  );
  const template = Handlebars.compile(
    readFileSync(join(BUILD_DIR, 'template.html')).toString()
  );

  const possibleValues = range(0, MAX_VALUE, 0.01);
  const bar = new ProgressBar(PROGRESS_BAR_FORMAT, {
    total: possibleValues.length,
    width: 40,
  });

  const baseContext = {
    accounts,
  };

  const redirects: Redirect[] = [];

  statusOutput('Generating pages');
  possibleValues.forEach(i => {
    if (i) {
      const value = parseFloat(i.toFixed(2));
      const context = {
        ...baseContext,
        displayValue: '£' + humanize(value),
        value: humanize(value),
      };
      writeTemplate(template, value.toString(), context);
      if (isPrecision(value, 1)) {
        redirects.push({
          src: value.toString() + '0',
          dest: value.toString(),
        });
        // writeTemplate(template, value.toString() + '0', context);
      }
      if (isPrecision(value, 0)) {
        redirects.push({
          src: value.toString() + '.00',
          dest: value.toString(),
        });
        redirects.push({
          src: value.toString() + '.0',
          dest: value.toString(),
        });
        // writeTemplate(template, value.toString() + '.00', context);
      }
    }
    bar.tick();
  });
  writeTemplate(template, '', { ...baseContext, displayValue: 'money' });
  const filesOutput = glob.sync(join(BUILD_DIR, '**/index.html')).length;
  console.log(`Generated ${filesOutput} files.`);
  writeRedirects(redirects);
})();
