import { Module } from '@nestjs/common';
import { ExcelParserService } from './excel-parser.service';

@Module({
  providers: [ExcelParserService],
  exports: [ExcelParserService],
})
export class ImportModule {}
