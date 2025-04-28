import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectModel } from '@nestjs/mongoose';
import { DateTime } from 'luxon';
import * as R from 'ramda';
import * as RA from 'ramda-adjunct';
import * as BluebirdPromise from 'bluebird';
import { Event, EventDocument, RecurrenceType } from './schemas/event.schema';
import mongoose, { Model } from 'mongoose';
import { UserService } from 'src/user/user.service';
import { User, UserDocument, UserRole } from 'src/user/schemas/user.schema';
import {
  add,
  compareAsc,
  intervalToDuration,
  isAfter,
  parse,
  parseISO,
  set,
  sub,
} from 'date-fns';
import { recurrenceTypeToDay } from './event.constant';
import {
  IEventUpdateData,
  UpdateRecurrenceType,
} from './interfaces/event-update-data.interface';
import { IEventInstance } from './interfaces/event-instance.interface';
import { IEventTime } from './interfaces/event-time.interface';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<Event>,
    private userService: UserService,
  ) {}

  async create(userId: string, createEventDto: CreateEventDto) {
    const { title, description, startTime, endTime, participants, recurrence } =
      createEventDto;

    /**
     * @todo Consider when given participant email does not exist in DB.
     */
    const participantDataInDbList = await this.userService.getUsers(
      'email',
      participants,
    );
    const participantIdInDbList = R.pluck('_id', participantDataInDbList);

    /**
     * @todo Handle case event orgainzer is by default event participant
     */
    const createdEvent = new this.eventModel({
      title,
      description,
      startTime: set(startTime, { seconds: 0, milliseconds: 0 }).toISOString(),
      endTime: set(endTime, { seconds: 0, milliseconds: 0 }).toISOString(),
      participants: participantIdInDbList,
      createdBy: userId,
      recurrence,
      createdAt: DateTime.utc().toISO(),
      updatedAt: DateTime.utc().toISO(),
    });

    const eventDataInDb = await createdEvent.save();

    return {
      success: true,
      eventId: eventDataInDb._id,
    };
  }

  compareEventUpdateData = R.curry(
    (
      propKey: string,
      eventUpdateDataA: IEventUpdateData,
      eventUpdateDataB: IEventUpdateData,
    ): number => {
      const updatedAtA = R.prop(propKey, eventUpdateDataA);
      const updatedAtB = R.prop(propKey, eventUpdateDataB);

      return compareAsc(parseISO(updatedAtA), parseISO(updatedAtB));
    },
  );

  private sortEventUpdateDataList(
    propKey: string,
    eventUpdateDataList: Array<IEventUpdateData>,
  ): Array<IEventUpdateData> {
    return R.sort(this.compareEventUpdateData(propKey), eventUpdateDataList);
  }

  private updateEventTime(
    eventUpdateDataItem: IEventUpdateData,
    eventInstanceItem: IEventInstance,
  ): Partial<IEventTime> {
    const {
      startTime: initialStartTime,
      endTime: initialEndTime,
      updateData: { newStartTime, newEndTime },
    } = eventUpdateDataItem;

    let updatedEventTime = {};

    const {
      startTime: eventInstanceInitialStartTime,
      endTime: eventInstanceInitialEndTime,
    } = eventInstanceItem;

    if (R.isNotNil(newStartTime)) {
      if (isAfter(newStartTime!, initialStartTime)) {
        const startTimeDuration = intervalToDuration({
          start: initialStartTime,
          end: newStartTime!,
        });
        const eventInstanceStartTime = add(
          eventInstanceInitialStartTime,
          startTimeDuration,
        );

        updatedEventTime = R.assoc(
          'startTime',
          eventInstanceStartTime,
          updatedEventTime,
        );
      } else {
        const startTimeDuration = intervalToDuration({
          start: newStartTime!,
          end: initialStartTime,
        });
        const eventInstanceStartTime = sub(
          eventInstanceInitialStartTime,
          startTimeDuration,
        );

        updatedEventTime = R.assoc(
          'startTime',
          eventInstanceStartTime,
          updatedEventTime,
        );
      }
    }

    if (R.isNotNil(newEndTime)) {
      if (isAfter(newEndTime!, initialEndTime)) {
        const endTimeDuration = intervalToDuration({
          start: initialEndTime,
          end: newEndTime!,
        });
        const eventInstanceEndTime = add(
          eventInstanceInitialEndTime,
          endTimeDuration,
        );
        updatedEventTime = R.assoc(
          'endTime',
          eventInstanceEndTime,
          updatedEventTime,
        );
      } else {
        const endTimeDuration = intervalToDuration({
          start: newEndTime!,
          end: initialEndTime,
        });
        const eventInstanceEndTime = sub(
          eventInstanceInitialEndTime,
          endTimeDuration,
        );
        updatedEventTime = R.assoc(
          'endTime',
          eventInstanceEndTime,
          updatedEventTime,
        );
      }
    }

    return updatedEventTime;
  }

  private async mergeEventUpdateData(
    userListInDb: Array<UserDocument>,
    eventInstanceItem: IEventInstance,
    eventUpdateDataItem: IEventUpdateData,
  ): Promise<IEventInstance> {
    const {
      updateData: {
        newParticipants,
        participantsToRemove,
        newStartTime,
        newEndTime,
      },
    } = eventUpdateDataItem;

    console.log('EVent update data item: ', eventUpdateDataItem);

    let updatedEventInstance = eventInstanceItem;
    const { participants: currentParticipantList } = eventInstanceItem;
    if (R.isNotNil(newParticipants) || R.isNotNil(participantsToRemove)) {
      const updatedParticipantList = await this.updateEventParticipants(
        userListInDb,
        newParticipants,
        participantsToRemove,
        currentParticipantList,
      );

      console.log('UPdated parti list: ', updatedParticipantList);
      console.log('Evett before new parti: ', updatedEventInstance);
      updatedEventInstance = R.mergeRight(updatedEventInstance, {
        participants: updatedParticipantList,
      });
      console.log('Event after new parti: ', updatedEventInstance);
    }

    if (R.isNotNil(newStartTime) || R.isNotNil(newEndTime)) {
      const updatedEventTime = this.updateEventTime(
        eventUpdateDataItem,
        eventInstanceItem,
      );

      updatedEventInstance = R.mergeRight(
        updatedEventInstance,
        updatedEventTime,
      );
    }

    updatedEventInstance = R.pipe(
      R.prop('updateData'),
      R.omit([
        'newParticipants',
        'participantsToRemove',
        'newStartTime',
        'newEndTime',
      ]),
      R.mergeRight(updatedEventInstance),
    )(eventUpdateDataItem);

    return updatedEventInstance;
  }

  private executeEventUpdates = R.curry(
    async (
      userListInDb: Array<UserDocument>,
      eventDataInDb: EventDocument,
      eventInstanceItem: IEventInstance,
    ): Promise<IEventInstance> => {
      const { updates: eventUpdateDataList } = eventDataInDb;

      const sortedEventUpdateDataList = this.sortEventUpdateDataList(
        'updatedAt',
        eventUpdateDataList,
      );

      const updatedEventInstance = await BluebirdPromise.reduce(
        sortedEventUpdateDataList,
        async (
          updateEventInstanceParam: IEventInstance,
          eventUpdateDataItem: IEventUpdateData,
        ): Promise<IEventInstance> => {
          const { updateRecurrenceType, index: eventUpdateStartIndex } =
            eventUpdateDataItem;

          const { index: eventInstanceIndex } = eventInstanceItem;

          if (updateRecurrenceType === UpdateRecurrenceType.ThisEvent) {
            if (eventInstanceIndex === eventUpdateStartIndex) {
              return this.mergeEventUpdateData(
                userListInDb,
                updateEventInstanceParam,
                eventUpdateDataItem,
              );
            }
          }

          if (updateRecurrenceType === UpdateRecurrenceType.ThisAndFollowing) {
            if (eventInstanceIndex >= eventUpdateStartIndex) {
              return this.mergeEventUpdateData(
                userListInDb,
                updateEventInstanceParam,
                eventUpdateDataItem,
              );
            }
          }

          if (updateRecurrenceType === UpdateRecurrenceType.AllEvents) {
            return this.mergeEventUpdateData(
              userListInDb,
              updateEventInstanceParam,
              eventUpdateDataItem,
            );
          }

          return updateEventInstanceParam;
        },
        eventInstanceItem,
      );

      return updatedEventInstance;
    },
  );

  private formatEventInstanceData(
    eventInstanceList: Array<Record<string, any>>,
  ) {
    const formatedEventInstanceList = R.map((eventInstanceItem) => {
      const { createdBy, participants } = eventInstanceItem;
      const eventCreatorEmail = R.prop('email', createdBy);
      const participantEmailList = R.pluck('email', participants);

      return R.mergeRight(eventInstanceItem, {
        createdBy: eventCreatorEmail,
        participants: participantEmailList,
      });
    }, eventInstanceList);

    return formatedEventInstanceList;
  }

  private async getEventInstanceList(
    eventDataInDb: Event,
    lastEventTime: string,
  ): Promise<Array<IEventInstance>> {
    const userListInDb = await this.userService.getUsers('email', []);
    const { startTime, endTime, recurrence } = eventDataInDb;
    const firstEventInstance = R.pipe(
      R.pickAll([
        'title',
        'description',
        'createdBy',
        'participants',
        'startTime',
        'endTime',
      ]),
      R.assoc('index', 0),
    )(eventDataInDb);

    const updatedFirstEventInstance = await this.executeEventUpdates(
      userListInDb,
      eventDataInDb,
      firstEventInstance,
    );
    let eventInstanceList = [updatedFirstEventInstance];

    let lastEventTimeExceeded = false;
    let prevEventStartTime = startTime;
    let prevEventEndTime = endTime;
    let index = 1;

    while (RA.isFalse(lastEventTimeExceeded)) {
      const currentEventInitialStartTime = add(prevEventStartTime, {
        days: recurrenceTypeToDay[recurrence],
      }).toISOString();
      const currentEventInitialEndTime = add(prevEventEndTime, {
        days: recurrenceTypeToDay[recurrence],
      }).toISOString();
      const currentEventInstance = R.mergeRight(firstEventInstance, {
        startTime: currentEventInitialStartTime,
        endTime: currentEventInitialEndTime,
        index,
      });

      const updatedEventInstance = await this.executeEventUpdates(
        userListInDb,
        eventDataInDb,
        currentEventInstance,
      );

      const { startTime: currentEventStartTime, endTime: currentEventEndTime } =
        updatedEventInstance;

      lastEventTimeExceeded = isAfter(currentEventStartTime, lastEventTime);
      index++;

      if (RA.isFalse(lastEventTimeExceeded)) {
        prevEventStartTime = currentEventInitialStartTime;
        prevEventEndTime = currentEventInitialEndTime;

        eventInstanceList = R.append(updatedEventInstance, eventInstanceList);
      }
    }

    const formatedEventInstanceList =
      this.formatEventInstanceData(eventInstanceList);

    return formatedEventInstanceList;
  }

  async getEvents(query: Record<string, any>, lastEventTime: string) {
    const eventDataInDbList = await this.eventModel
      .find(query)
      .populate(['createdBy', 'participants'])
      .exec();

    const eventDataWithInstanceList = await BluebirdPromise.map(
      eventDataInDbList,
      async (eventDataInDbItem: EventDocument) => {
        const { _id: eventId } = eventDataInDbItem;
        const eventInstanceList = await this.getEventInstanceList(
          eventDataInDbItem,
          lastEventTime,
        );

        return {
          eventId,
          instanceList: eventInstanceList,
        };
      },
    );

    return eventDataWithInstanceList;
  }

  async getEvent(query: Record<string, any>) {
    const eventDataInDb = await this.eventModel
      .findOne(query)
      .populate(['createdBy', 'participants'])
      .exec();

    return eventDataInDb;
  }

  private getParticipantData(
    userListInDb: Array<UserDocument>,
    participantList: Array<string>,
  ) {
    const paritcipantDataList = R.filter((userItemInDb: UserDocument) => {
      const emailInDb = R.prop('email', userItemInDb);

      return R.includes(emailInDb, participantList);
    }, userListInDb);

    return paritcipantDataList;
  }

  private async updateEventParticipants(
    userListInDb: Array<UserDocument>,
    newParticipants: Array<string> | undefined,
    participantsToRemove: Array<string> | undefined,
    currentParticipantList: Array<string>,
  ): Promise<Array<User>> {
    const currentParticipantDataInDbList = this.getParticipantData(
      userListInDb,
      currentParticipantList,
    );

    let updatedParticipantList = currentParticipantDataInDbList;

    if (R.isNotNil(participantsToRemove)) {
      updatedParticipantList = R.reject((participantDataInDbItem: User) => {
        const emailInDb = R.prop('email', participantDataInDbItem);

        const isParticipantRemovable = R.includes(
          emailInDb,
          participantsToRemove,
        );

        return isParticipantRemovable;
      })(currentParticipantDataInDbList);
    }

    if (R.isNotNil(newParticipants)) {
      const newParticipantDataInDbList = this.getParticipantData(
        userListInDb,
        newParticipants || [],
      );

      updatedParticipantList = R.pipe(
        R.concat(updatedParticipantList),
        // Deduplicate participant email
        R.uniq,
      )(newParticipantDataInDbList);
    }

    return updatedParticipantList;
  }

  private getEventInstanceTime(
    firstInstanceStartTime: string,
    firstInstanceEndTime: string,
    recurrence: RecurrenceType,
    instanceIndex: number,
  ): IEventTime {
    let prevEventStartTime = firstInstanceStartTime;
    let prevEventEndTime = firstInstanceEndTime;
    let index = 1;

    while (R.gt(instanceIndex, index)) {
      const currentEventStartTime = add(prevEventStartTime, {
        days: recurrenceTypeToDay[recurrence],
      }).toISOString();
      const currentEventEndTime = add(prevEventEndTime, {
        days: recurrenceTypeToDay[recurrence],
      }).toISOString();

      prevEventStartTime = currentEventStartTime;
      prevEventEndTime = currentEventEndTime;

      index++;
    }

    return { startTime: prevEventStartTime, endTime: prevEventEndTime };
  }

  private formatEventUpdateData(
    eventInstanceIndex: number,
    eventDataInDb: Event,
    updateEventDto: UpdateEventDto,
  ): IEventUpdateData {
    const {
      startTime: firstInstanceStartTime,
      endTime: firstInstanceEndTime,
      recurrence,
    } = eventDataInDb;

    const {
      startTime: eventInstanceInitialStartTime,
      endTime: eventInstanceInitialEndTime,
    } = this.getEventInstanceTime(
      firstInstanceStartTime,
      firstInstanceEndTime,
      recurrence as RecurrenceType,
      eventInstanceIndex,
    );
    const { updateRecurrenceType } = updateEventDto;

    const formatedUpdateEventDto = R.omit(
      ['updateRecurrenceType'],
      updateEventDto,
    );

    return R.assoc('updateData', formatedUpdateEventDto, {
      index: eventInstanceIndex,
      updatedAt: DateTime.utc().toISO(),
      updateRecurrenceType,
      startTime: eventInstanceInitialStartTime,
      endTime: eventInstanceInitialEndTime,
    });
  }

  async update(
    userId: string,
    eventId: string,
    eventInstanceIndex: number,
    updateEventDto: UpdateEventDto,
  ) {
    try {
      const eventDataInDb = (await this.getEvent({
        _id: eventId,
      })) as EventDocument;

      const { role: userRole } = (await this.userService.getUser({
        _id: userId,
      })) as UserDocument;

      const eventUpdateList = R.prop('updates', eventDataInDb);

      const { _id: eventCreatorId } = eventDataInDb.createdBy as UserDocument;

      /**
       * @todo userId/eventId may not exist in DB casuing 500 error. Use try/catch
       * to handle.
       */

      if (userRole !== UserRole.Admin && userId !== eventCreatorId.toString()) {
        throw new UnauthorizedException(
          'This user is not allowed to update event!',
        );
      }

      const newEventUpdateData = this.formatEventUpdateData(
        eventInstanceIndex,
        eventDataInDb,
        updateEventDto,
      );

      const updatedEventUpdateList = R.append(
        newEventUpdateData,
        eventUpdateList,
      );

      await this.eventModel.updateOne(
        { _id: eventId },
        { updates: updatedEventUpdateList },
      );

      return {
        success: true,
      };
    } catch (error: any) {
      console.log('[Error]: ', error.message);
      console.log(error);

      throw new BadRequestException(
        'Please confirm `eventId`, `userId` are accurate!',
      );
    }
  }

  async remove(userId: string, eventId: string) {
    const eventDataInDb = (await this.getEvent({
      _id: eventId,
    })) as EventDocument;

    const { email, role: userRole } = (await this.userService.getUser({
      _id: userId,
    })) as UserDocument;

    const { _id: eventCreatorId } = eventDataInDb.createdBy as UserDocument;

    /**
     * @todo userId/eventId may not exist in DB casuing 500 error. Use try/catch
     * to handle.
     */

    if (userRole !== UserRole.Admin && userId !== eventCreatorId.toString()) {
      throw new UnauthorizedException('User is not allowed to delete event!');
    }

    await this.eventModel.deleteOne({
      _id: eventId,
    });

    return {
      success: true,
    };
  }
}
