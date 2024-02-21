import { Injectable, StreamableFile } from '@nestjs/common';
import { createReadStream } from 'fs';
import * as fs from 'fs';
import axios from 'axios';
import * as _ from 'lodash';

@Injectable()
export class EmailsParserService {
  async parseData(link: string) {
    console.log(link);
    const columns = ['companyName', 'site', 'emails'].toString() + '\n';

    function extract(str) {
      const email = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-z]+)/gi;
      return str.match(email);
    }

    fs.writeFileSync('./src/emailsParser/prod.csv', columns);
    const data = await axios.get(link);
    const result = data.data.substring(
      data.data.indexOf('"Wystawcy":'),
      data.data.lastIndexOf('}},"json"'),
    );
    let i = 1;
    const exhibitors = Object.values(JSON.parse(`{${result}}`)['Wystawcy']);
    for (const el of exhibitors) {
      try {
        const parsedData = await axios.get(
          el.www.includes('https://') || el.www.includes('http://')
            ? el.www.trim()
            : 'https://' + el.www.trim(),
        );
        const emails = _.uniq(extract(JSON.stringify(parsedData.data)));
        el.mails = emails
          .filter((ml) => !ml.match('.jpg'))
          .filter((ml) => !ml.match('.png'))
          .filter((ml) => !ml.match('.jpeg'));
        const companyData = {
          companyName: el['Nazwa_wystawcy'] ?? '--',
          site: el.www ?? '--',
          emails: `${JSON.stringify(el.mails.toString()) ?? '--'}`,
        };
        fs.appendFileSync(
          './src/emailsParser/prod.csv',
          Object.values(companyData).toString() + '\n',
        );
        ++i;
        console.log(i);
      } catch {
        continue;
      }
    }
    const file = createReadStream(`./src/emailsParser/prod.csv`);
    return new StreamableFile(file);
  }
}
