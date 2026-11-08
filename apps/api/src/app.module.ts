// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module, RequestMethod } from '@nestjs/common';
import type { MiddlewareConsumer } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { SessionService } from './auth/session.service';
import { OrganizationsController } from './organizations/organizations.controller';
import { SwitchOrgController } from './organizations/switch-org.controller';
import { TenantMiddleware } from './auth/tenant.middleware';
import { WorkspaceController } from './workspaces/workspace.controller';
import { WorkspaceService } from './workspaces/workspace.service';
import { ProjectController } from './projects/project.controller';
import { ProjectService } from './projects/project.service';
import { InvitationController } from './members/invitation.controller';
import { InvitationService } from './members/invitation.service';
import { AttachmentController } from './attachments/attachment.controller';
import { AttachmentService } from './attachments/attachment.service';
import { HrController } from './hr/hr.controller';
import { HrService } from './hr/hr.service';
import { MemberController } from './members/member.controller';
import { TaskController } from './tasks/task.controller';
import { TaskService } from './tasks/task.service';
import { CommentController } from './comments/comment.controller';
import { CommentService } from './comments/comment.service';
import { DocumentController } from './documents/document.controller';
import { DocumentService } from './documents/document.service';
import { NotificationController } from './notifications/notification.controller';
import { NotificationService } from './notifications/notification.service';
import { ApprovalController } from './approvals/approval.controller';
import { ApprovalService } from './approvals/approval.service';

@Module({
  imports: [DbModule],
  controllers: [
    AuthController,
    OrganizationsController,
    SwitchOrgController,
    WorkspaceController,
    ProjectController,
    InvitationController,
    AttachmentController,
    HrController,
    MemberController,
    TaskController,
    CommentController,
    DocumentController,
    NotificationController,
    ApprovalController,
  ],
  providers: [
    AuthService,
    SessionService,
    TenantMiddleware,
    WorkspaceService,
    ProjectService,
    InvitationService,
    AttachmentService,
    HrService,
    TaskService,
    CommentService,
    DocumentService,
    NotificationService,
    ApprovalService,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
      )
      .forRoutes('*');
  }
}
