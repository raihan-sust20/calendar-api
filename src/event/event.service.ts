import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectModel } from '@nestjs/mongoose';
import { DateTime } from 'luxon';
import * as R from 'ramda';
import { Event, EventDocument } from './schemas/event.schema';
import mongoose, { Model } from 'mongoose';
import { UserService } from 'src/user/user.service';
import { UserDocument, UserRole } from 'src/user/schemas/user.schema';

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

    // const { _id: eventCreatorId } = await this.userService.getUser({
    //   _id: userId,
    // });

    /**
     * @todo Handle case event orgainzer is by default event participant
     */
    const createdEvent = new this.eventModel({
      title,
      description,
      startTime: DateTime.fromISO(startTime).toJSDate(),
      endTime: DateTime.fromISO(endTime).toJSDate(),
      participants: participantIdInDbList,
      createdBy: userId,
      createdAt: DateTime.now().toJSDate(),
    });

    const eventDataInDb = await createdEvent.save();

    return {
      success: true,
    };
  }

  findAll() {
    return `This action returns all event`;
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
    // const participantDataInDbList = await this.userService.getUsers(
    //   '_id',
    //   participantIdInDbList,
    // );

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

    console.log('User email: ', email);
    console.log('Creator email: ', eventDataInDb.createdBy);

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

    // const udpatedEventData = R.mergeRight(eventDataInDb, coreUpdateEventData);

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

    if (
      userRole !== UserRole.Admin &&
      email !== eventDataInDb.createdBy.email
    ) {
      throw new UnauthorizedException('User is not allowed to update event!');
    }

    await this.eventModel.deleteOne({
      _id: eventId,
    });

    return {
      success: true,
    };
  }
}
