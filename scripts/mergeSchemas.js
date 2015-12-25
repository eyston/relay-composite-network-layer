import fs from 'fs';
import path from 'path';

import localSchema from '../data/local/schema.json';
import serverSchema from '../data/server/schema.json';

import {createCompositeSchema} from '../src/merge';

const {schema,config} = createCompositeSchema({
  server: serverSchema,
  local: localSchema
}, {
  queryType: 'Query'
});

fs.writeFileSync(
  path.join(__dirname, '../data/', 'schema.json'),
  JSON.stringify(schema, null, 2)
);

fs.writeFileSync(
  path.join(__dirname, '../data/', 'config.json'),
  JSON.stringify(config, null, 2)
);
