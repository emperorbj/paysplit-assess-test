import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { AdminAuditService } from './services/admin-audit.service';

/** Admin audit trail. Has no domain dependencies so AuthModule can import it. */
@Module({
  imports: [SequelizeModule.forFeature([AdminAuditLog])],
  providers: [AdminAuditService],
  exports: [AdminAuditService],
})
export class AuditModule {}
