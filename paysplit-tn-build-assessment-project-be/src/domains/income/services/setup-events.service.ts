import { Injectable } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/services/users.service';
import { OnboardingStatus } from '../../users/utils/onboarding-status';
import { NotificationsService } from '../../notifications/services/notifications.service';

export const SETUP_COMPLETED_NOTIFICATION = 'setup_completed';

/**
 * Runs after anything that can complete the setup checklist (income saved,
 * first rule created). Returns the fresh onboarding status and, the first time
 * setup becomes complete, posts a "you're all set" notification.
 */
@Injectable()
export class SetupEventsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly notifications: NotificationsService,
  ) {}

  async afterSetupChange(user: User): Promise<OnboardingStatus> {
    const onboarding = await this.usersService.getOnboardingStatus(user);
    if (
      onboarding.setupChecklist.completed &&
      !(await this.notifications.exists(user.id, SETUP_COMPLETED_NOTIFICATION))
    ) {
      await this.notifications.notify(user, {
        type: SETUP_COMPLETED_NOTIFICATION,
        topic: 'accountUpdates',
        title: 'Your salary partitions are set up',
        body: 'Your split rules will run automatically when your next salary arrives.',
        email: true,
        actionUrl: '/split-rules',
      });
    }
    return onboarding;
  }
}
