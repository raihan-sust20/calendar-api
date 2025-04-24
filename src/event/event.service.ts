import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectModel } from '@nestjs/mongoose';
import { DateTime } from 'luxon';
import * as R from 'ramda';
import { Event, EventDocument } from './schemas/event.schema';
import { Model } from 'mongoose';
import { UserService } from 'src/user/user.service';
import { UserDocument, UserRole } from 'src/user/schemas/user.schema';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<Event>,
    private userService: UserService,
  ) {}

  async create(createEventDto: CreateEventDto) {
    const { title, description, startTime, endTime, pariticipants, userId } =
      createEventDto;

    const participantDataInDbList =
      await this.userService.getUsers(pariticipants);
    const createdByUserDataInDb = await this.userService.getUser({
      _id: userId,
    });
    // const pariticipantIdInDbList = R.pluck('_id', pariticipantDataInDbList);

    /**
     * @todo Handle case event orgainzer is by default event participant
     */
    const createdEvent = new this.eventModel({
      title,
      description,
      startTime: DateTime.fromISO(startTime).toJSDate(),
      endTime: DateTime.fromISO(endTime).toJSDate(),
      participants: participantDataInDbList,
      createdBy: createdByUserDataInDb,
      createdAt: DateTime.now().toJSDate(),
    });

    const eventDataInDb = await createdEvent.save();

    return eventDataInDb;
  }

  findAll() {
    return `This action returns all event`;
  }

  async getEvent(query: Record<string, any>) {
    const eventDataInDb = await this.eventModel.findOne(query).exec();

    return eventDataInDb;
  }

  private async updateEventParticipants(
    newParticipants: Array<string> | undefined,
    pariticipantsToRemove: Array<string> | undefined,
    eventDataInDb: EventDocument,
  ) {
    const { participants: participantDataInDbList } = eventDataInDb;

    let updatedParticipantList = participantDataInDbList;

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

    if (R.isNotNil(newParticipants)) {
      const newParticipantDataInDbList = await this.userService.getUsers(
        newParticipants || [],
      );

      updatedParticipantList = R.concat(
        updatedParticipantList,
        newParticipantDataInDbList,
      );
    }

    return updatedParticipantList;
  }

  async update(eventId: string, updateEventDto: UpdateEventDto) {
    const eventDataInDb = (await this.getEvent({
      _id: eventId,
    })) as EventDocument;

    const { userId } = updateEventDto;
    const userData = (await this.userService.getUser({
      _id: userId,
    })) as UserDocument;

    const { role: userRole } = userData;
    if (userRole !== UserRole.Admin && userId !== eventDataInDb.createdBy) {
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

    const udpatedEventData = R.mergeRight(eventDataInDb, coreUpdateEventData);

    return udpatedEventData.save();
  }

  remove(id: number) {
    return `This action removes a #${id} event`;
  }
}
