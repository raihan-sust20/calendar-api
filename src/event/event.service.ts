import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectModel } from '@nestjs/mongoose';
import { DateTime } from 'luxon';
import * as R from 'ramda';
import { Event, EventDocument, RecurrenceType } from './schemas/event.schema';
import mongoose, { Model } from 'mongoose';
import { UserService } from 'src/user/user.service';
import { UserDocument, UserRole } from 'src/user/schemas/user.schema';
import { add, isAfter, parse, parseISO } from 'date-fns';
import { recurrenceToDayCount, recurrenceTypeToDay } from './event.constant';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<Event>,
    private userService: UserService,
  ) {}

  async create(userId: string, createEventDto: CreateEventDto) {
    const { title, description, startTime, endTime, pariticipants } =
      createEventDto;

    /**
     * @todo Consider when given participant email does not exist in DB.
     */
    const participantDataInDbList = await this.userService.getUsers(
      'email',
      pariticipants,
    );
    const participantIdInDbList = R.pluck('_id', participantDataInDbList);

    /**
     * @todo Handle case event orgainzer is by default event participant
     */
    const createdEvent = new this.eventModel({
      title,
      description,
      startTime,
      endTime,
      participants: participantIdInDbList,
      createdBy: userId,
      createdAt: DateTime.now().toISO(),
      updatedAt: DateTime.now().toISO(),
    });

    await createdEvent.save();

    return {
      success: true,
    };
  }

  getEventOccurence(eventDataInDb: EventDocument, endDateStr: string) {
    const { startTime: eventStartTime } = eventDataInDb;
    const endDate = parse(endDateStr, 'dd-MM-yyyy', new Date());
    const {
      title,
      description,
      createdBy,
      participants,
      startTime,
      endTime,
      recurrence,
    } = eventDataInDb;
    let eventOccurence = [
      {
        title,
        description,
        createdBy,
        participants,
        startTime,
        endTime,
        recurrence,
      },
    ];

    let eventDatePassedEndDate = false;
    while (eventDatePassedEndDate) {
      const nextEventStartTime = add(parseISO(startTime), {
        days: recurrenceTypeToDay[recurrence],
      }).toISOString();
      const nextEventEndTime = add(parseISO(startTime), {
        days: recurrenceTypeToDay[recurrence],
      }).toISOString();

      const nextEventStartDate = add(parseISO(startTime), {
        days: recurrenceTypeToDay[recurrence],
      });
      eventDatePassedEndDate = isAfter(nextEventStartDate, endDate);
    }
  }

  async getEvents(query: Record<string, any>, endDate: string) {
    const eventDataInDb = await this.eventModel
      .find(query)
      .populate(['createdBy', 'participants'])
      .exec();

    return eventDataInDb;
  }

  async getEvent(query: Record<string, any>) {
    const eventDataInDb = await this.eventModel
      .findOne(query)
      .populate(['createdBy', 'participants'])
      .exec();

    return eventDataInDb;
  }

  private async updateEventParticipants(
    newParticipants: Array<string> | undefined,
    pariticipantsToRemove: Array<string> | undefined,
    eventDataInDb: EventDocument,
  ) {
    const { participants: participantDataInDbList } = eventDataInDb;

    let updatedParticipantList = participantDataInDbList;

    console.log('Before reject: ', updatedParticipantList);

    if (R.isNotNil(pariticipantsToRemove)) {
      updatedParticipantList = R.reject(
        (participantDataInDbItem: UserDocument) => {
          const emailInDb = R.prop('email', participantDataInDbItem);

          const isParticipantRemovable = R.includes(
            emailInDb,
            pariticipantsToRemove,
          );

          return isParticipantRemovable;
        },
      )(participantDataInDbList);
    }

    console.log('After reject: ', updatedParticipantList);

    if (R.isNotNil(newParticipants)) {
      const newParticipantDataInDbList = await this.userService.getUsers(
        'email',
        newParticipants || [],
      );

      updatedParticipantList = R.concat(
        updatedParticipantList,
        newParticipantDataInDbList,
      );
    }

    return updatedParticipantList;
  }

  async update(
    userId: string,
    eventId: string,
    updateEventDto: UpdateEventDto,
  ) {
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
      throw new UnauthorizedException('User is not allowed to update event!');
    }

    const { newParticipants, pariticipantsToRemove } = updateEventDto;

    const updatedParticipants = await this.updateEventParticipants(
      newParticipants,
      pariticipantsToRemove,
      eventDataInDb,
    );

    const coreUpdateEventData = R.pipe(
      R.omit(['newParticipants', 'pariticipantsToRemove', 'userId']),
      R.assoc('participants', updatedParticipants),
    )(updateEventDto);

    await this.eventModel.updateOne({ _id: eventId }, coreUpdateEventData);

    return {
      success: true,
    };
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
