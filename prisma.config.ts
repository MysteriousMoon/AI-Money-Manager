import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  datasource: {
    url: (() => {
      console.log('DATABASE_URL:', process.env.DATABASE_URL);
      return process.env.DATABASE_URL!;
    })(),
  },
});
