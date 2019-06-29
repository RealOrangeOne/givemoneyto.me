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
  return parseFloat(value.toFixed(precision)) === value;
}

function writeTemplate(
  template: HandlebarsTemplateDelegate,
  value: string,
  context: any
) {
  const outputFile = join(BUILD_DIR, value, 'index.html');
  mkdirp.sync(dirname(outputFile));
  writeFileSync(outputFile, template(context));
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

  statusOutput('Generating pages');
  possibleValues.forEach(i => {
    if (i) {
      const value = parseFloat(i.toFixed(2));
      const context = {
        ...baseContext,
        value: value.toFixed(2),
      };
      writeTemplate(template, value.toString(), context);
      if (isPrecision(value, 1)) {
        writeTemplate(template, value.toString() + '0', context);
      }
      if (isPrecision(value, 0)) {
        writeTemplate(template, value.toString() + '.00', context);
      }
    }
    bar.tick();
  });
  writeTemplate(template, '', { ...baseContext, value: '' });
  const filesOutput = glob.sync(join(BUILD_DIR, '**/index.html')).length;
  console.log(`Generated ${filesOutput} files.`);
})();
