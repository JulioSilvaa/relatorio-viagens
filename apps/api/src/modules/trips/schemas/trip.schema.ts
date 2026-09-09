import { z } from 'zod';

export const UF_VALUES = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
] as const;

export const ufSchema = z.enum(UF_VALUES);

export const vehicleTypeSchema = z.enum(['PROPRIO', 'EMPRESA', 'ALUGADO']);

export const departmentSchema = z.enum(['COMERCIAL', 'TECNICO']);

export const tripBaseSchema = z.object({
  cliente: z.string().trim().min(2, 'Cliente é obrigatório'),
  cidade: z.string().trim().min(2, 'Cidade é obrigatória'),
  uf: ufSchema,
  dataSaida: z.coerce.date(),
  dataRetorno: z.coerce.date(),
  departamento: departmentSchema,
  motivo: z.string().trim().min(3, 'Motivo é obrigatório'),
  veiculo: z.string().trim().min(1).optional().nullable(),
  placa: z.string().trim().min(1).optional().nullable(),
  tipoVeiculo: vehicleTypeSchema.optional().nullable(),
  kmInicial: z.coerce.number().nonnegative().optional().nullable(),
  kmFinal: z.coerce.number().nonnegative().optional().nullable(),
  centroDeCustoId: z.string().uuid().optional().nullable(),
  observacoes: z.string().trim().min(1).optional().nullable(),
});

export const createTripSchema = tripBaseSchema;
export const updateTripSchema = tripBaseSchema.partial();

export const cancelTripSchema = z.object({
  motivo: z.string().trim().min(3, 'Motivo do cancelamento é obrigatório'),
});

export const addParticipantSchema = z.object({
  userId: z.string().uuid('Colaborador inválido'),
});

export type CreateTripDto = z.infer<typeof createTripSchema>;
export type UpdateTripDto = z.infer<typeof updateTripSchema>;
export type CancelTripDto = z.infer<typeof cancelTripSchema>;
export type AddParticipantDto = z.infer<typeof addParticipantSchema>;
export type VehicleTypeValue = z.infer<typeof vehicleTypeSchema>;
export type UfValue = z.infer<typeof ufSchema>;
export type DepartmentValue = z.infer<typeof departmentSchema>;
