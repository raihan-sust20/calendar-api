import { Injectable } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectModel } from '@nestjs/mongoose';
import { DateTime } from 'luxon';
import * as R from 'ramda';
import { Event } from './schemas/event.schema';
import { Model } from 'mongoose';
import { UserService } from 'src/user/user.service';

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

    const eventDataInDb = await createdEvent.save()

    return eventDataInDb;
  }

  findAll() {
    return `This action returns all event`;
  }

  findOne(id: number) {
    return `This action returns a #${id} event`;
  }

  update(id: number, updateEventDto: UpdateEventDto) {
    return `This action updates a #${id} event`;
  }

  remove(id: number) {
    return `This action removes a #${id} event`;
  }
}
