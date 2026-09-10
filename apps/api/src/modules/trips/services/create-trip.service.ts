import type { AuditService } from '../../../modules/audit/audit.service.js';
import type { NotificationPublisher } from '../../notifications/notification-publisher.js';
import type { UsersRepository } from '../../users/repositories/users.repository.js';
import type { CostCentersRepository } from '../../cost-centers/repositories/cost-centers.repository.js';
import { CostCenterNotFoundError } from '../trip.errors.js';
import { tripToView } from '../presenters/trip.presenter.js';
import type { TripsRepository } from '../repositories/trips.repository.js';
import type { CreateTripDto } from '../schemas/trip.schema.js';
import type { TripView } from '../trip.types.js';
import { assertValidTripDates, assertValidTripKms, computeTaxaKm } from './trip-rules.js';

export interface CreateTripActor {
  id: string;
  name: string;
}

export class CreateTripService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly costCenters: CostCentersRepository,
    private readonly audit: AuditService,
    private readonly users: UsersRepository,
    private readonly notifier: NotificationPublisher,
  ) {}

  async execute(dto: CreateTripDto, actor: CreateTripActor): Promise<TripView> {
    assertValidTripDates(dto.dataSaida, dto.dataRetorno);
    assertValidTripKms(dto.kmInicial, dto.kmFinal);

    if (dto.centroDeCustoId) {
      const center = await this.costCenters.findActiveById(dto.centroDeCustoId);
      if (!center) {
        throw new CostCenterNotFoundError();
      }
    }

    const taxaKm =
      dto.taxaKm != null
        ? String(dto.taxaKm)
        : computeTaxaKm(dto.tipoVeiculo, dto.kmInicial, dto.kmFinal);

    const created = await this.trips.createTrip({
      ...dto,
      kmInicial: dto.kmInicial != null ? String(dto.kmInicial) : null,
      kmFinal: dto.kmFinal != null ? String(dto.kmFinal) : null,
      criadoPorId: actor.id,
      criadoPorNome: actor.name,
      taxaKm,
    });

    await this.audit.record({
      userId: actor.id,
      operation: 'CRIAR',
      entityType: 'VIAGEM',
      entityId: created.id,
      newValue: `${created.cliente} (${created.cidade}-${created.uf})`,
    });

    const managers = await this.users.findAllByRoleCode('MANAGER_ADMIN');
    if (managers.length > 0) {
      await this.notifier.notifyMany({
        event: 'VIAGEM_CRIADA',
        message: `Nova viagem criada: ${created.cliente} (${created.cidade}-${created.uf}).`,
        tripId: created.id,
        userIds: managers.map((manager) => manager.id),
      });
    }

    return tripToView(created);
  }
}
