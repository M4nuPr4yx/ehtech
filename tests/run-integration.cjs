const { spawnSync } = require('node:child_process')
const path = require('node:path')
const result = spawnSync(process.execPath, ['--test', 'tests/api-integration.test.cjs'], {
  cwd: path.join(__dirname, '..'), env: { ...process.env, RUN_DB_TESTS: '1', TEST_DB_DRIVER: process.argv.includes('--postgres') ? 'postgres' : 'mysql' }, stdio: 'inherit'
})
if (result.error) console.error(result.error.message)
process.exitCode = result.status ?? 1
