import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import YAML from 'yaml';

const root = process.cwd();
const errors = [];
const required = [
  'README.md',
  'AGENTS.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'LICENSE',
  'biome.json',
  '.env.example',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'packages/db/prisma/schema.prisma',
  '.github/workflows/ci.yml',
  '.github/workflows/validate.yml',
  '.github/workflows/pr-check.yml',
  '.github/workflows/codeql.yml',
  '.github/dependabot.yml',
];
for (const file of required)
  if (!existsSync(join(root, file))) errors.push(`Missing ${file}`);

const jsonFiles = [
  'package.json',
  'apps/api/package.json',
  'apps/web/package.json',
  'packages/db/package.json',
  'apps/api/tsconfig.json',
  'apps/web/tsconfig.json',
  'biome.json',
];
for (const file of jsonFiles) {
  try {
    JSON.parse(readFileSync(join(root, file), 'utf8'));
  } catch (error) {
    errors.push(`Invalid JSON ${file}: ${error.message}`);
  }
}

function filesIn(directory, suffixes) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (
        ['.next', 'dist', 'node_modules', 'coverage', 'test-results'].includes(
          entry.name,
        )
      )
        return [];
      return filesIn(path, suffixes);
    }
    return suffixes.includes(extname(path)) ? [path] : [];
  });
}

const yamlFiles = [
  join(root, 'docker-compose.yml'),
  join(root, 'pnpm-lock.yaml'),
  join(root, 'pnpm-workspace.yaml'),
  ...filesIn(join(root, '.github'), ['.yml', '.yaml']),
];
for (const file of yamlFiles) {
  if (!existsSync(file)) continue;
  const document = YAML.parseDocument(readFileSync(file, 'utf8'), {
    uniqueKeys: true,
  });
  for (const error of document.errors)
    errors.push(`${relative(root, file)}: ${error.message}`);
  if (file.includes(`${sep}workflows${sep}`)) {
    const workflow = document.toJS();
    if (!workflow?.on || !workflow?.jobs)
      errors.push(`${relative(root, file)} needs on and jobs`);
  }
}

const documented = new Set(
  [
    ...readFileSync(join(root, '.env.example'), 'utf8').matchAll(
      /^([A-Z][A-Z0-9_]*)=/gm,
    ),
  ].map((match) => match[1]),
);
const standard = new Set(['NODE_ENV', 'CI', 'PLAYWRIGHT_CHROMIUM_EXECUTABLE']);
const sourceFiles = filesIn(join(root, 'apps'), ['.ts', '.tsx'])
  .filter((file) => !file.endsWith('next-env.d.ts'))
  .concat(filesIn(join(root, 'packages'), ['.ts', '.tsx']));
const graph = new Map();
function localTarget(from, specifier) {
  let base;
  if (specifier.startsWith('.')) base = resolve(dirname(from), specifier);
  else if (specifier.startsWith('@/'))
    base = resolve(root, 'apps/web/src', specifier.slice(2));
  else return null;
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ])
    if (existsSync(candidate) && ['.ts', '.tsx'].includes(extname(candidate)))
      return candidate;
  errors.push(`Unresolved import ${specifier} in ${relative(root, from)}`);
  return null;
}
for (const file of sourceFiles) {
  const source = readFileSync(file, 'utf8');
  for (const [, name] of source.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g))
    if (!documented.has(name) && !standard.has(name))
      errors.push(
        `Undocumented environment variable ${name} in ${relative(root, file)}`,
      );
  const targets = [];
  for (const [, specifier] of source.matchAll(
    /(?:\bfrom\s*|\bimport\s*\()\s*['"]([^'"]+)['"]/g,
  )) {
    if (
      file.includes(`${sep}apps${sep}web${sep}`) &&
      (specifier === '@inside/db' ||
        specifier.includes('/api/src') ||
        specifier.includes('/packages/db/'))
    )
      errors.push(
        `Frontend crosses the API/database boundary in ${relative(root, file)}`,
      );
    const target = localTarget(file, specifier);
    if (target) {
      const sourcePackage = relative(root, file)
        .split(sep)
        .slice(0, 2)
        .join('/');
      const targetPackage = relative(root, target)
        .split(sep)
        .slice(0, 2)
        .join('/');
      if (sourcePackage !== targetPackage)
        errors.push(
          `Cross-package relative import in ${relative(root, file)}: ${specifier}`,
        );
      targets.push(target);
    }
  }
  graph.set(file, targets);
}
const visiting = new Set();
const visited = new Set();
function visit(file) {
  if (visiting.has(file)) {
    errors.push(`Import cycle involving ${relative(root, file)}`);
    return;
  }
  if (visited.has(file)) return;
  visiting.add(file);
  for (const target of graph.get(file) || []) visit(target);
  visiting.delete(file);
  visited.add(file);
}
for (const file of graph.keys()) visit(file);

if (errors.length) {
  for (const error of [...new Set(errors)]) process.stderr.write(`${error}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Repository structure, config, imports, boundaries and environment declarations valid (${sourceFiles.length} source files).\n`,
  );
}
