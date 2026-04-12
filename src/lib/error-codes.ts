export const ErrorCodes = {
  CHUNK_LOAD_ERROR: 'E001',

  ESI_TOKEN_EXPIRED: 'A001',
  ESI_TOKEN_INVALID: 'A002',
  ESI_FETCH_FAILED: 'A003',
  ESI_REFRESH_FAILED: 'A004',
  ESI_NO_TOKEN: 'A005',

  OAUTH_EXCHANGE_FAILED: 'B001',
  OAUTH_INVALID_RESPONSE: 'B002',

  API_FETCH_FAILED: 'C001',
  API_NOT_FOUND: 'C002',
  API_UNAUTHORIZED: 'C003',
  API_FORBIDDEN: 'C004',
  API_SERVER_ERROR: 'C005',

  VALIDATION_FAILED: 'D001',
  INVALID_INPUT: 'D002',

  DATABASE_ERROR: 'E002',
  DB_CONNECTION_FAILED: 'E003',

  UNKNOWN_ERROR: 'Z999',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]
export type ErrorCodeKey = keyof typeof ErrorCodes

export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCodes.CHUNK_LOAD_ERROR]: 'Erro ao carregar recurso. Atualize a página.',

  [ErrorCodes.ESI_TOKEN_EXPIRED]: 'Sessão expirada. Faça login novamente.',
  [ErrorCodes.ESI_TOKEN_INVALID]: 'Token inválido. Faça login novamente.',
  [ErrorCodes.ESI_FETCH_FAILED]: 'Falha ao buscar dados do personagem.',
  [ErrorCodes.ESI_REFRESH_FAILED]: 'Falha ao atualizar sessão.',
  [ErrorCodes.ESI_NO_TOKEN]: 'Sessão não encontrada. Faça login.',

  [ErrorCodes.OAUTH_EXCHANGE_FAILED]: 'Falha na autenticação.',
  [ErrorCodes.OAUTH_INVALID_RESPONSE]: 'Resposta inválida do servidor de autenticação.',

  [ErrorCodes.API_FETCH_FAILED]: 'Falha na comunicação com o servidor.',
  [ErrorCodes.API_NOT_FOUND]: 'Recurso não encontrado.',
  [ErrorCodes.API_UNAUTHORIZED]: 'Não autorizado.',
  [ErrorCodes.API_FORBIDDEN]: 'Acesso negado.',
  [ErrorCodes.API_SERVER_ERROR]: 'Erro interno do servidor.',

  [ErrorCodes.VALIDATION_FAILED]: 'Dados inválidos.',
  [ErrorCodes.INVALID_INPUT]: 'Entrada inválida.',

  [ErrorCodes.DATABASE_ERROR]: 'Erro no banco de dados.',
  [ErrorCodes.DB_CONNECTION_FAILED]: 'Falha conexão banco de dados.',

  [ErrorCodes.UNKNOWN_ERROR]: 'Erro desconhecido.',
}

export function getErrorMessage(code: ErrorCode): string {
  return ErrorMessages[code] || ErrorMessages[ErrorCodes.UNKNOWN_ERROR]
}

export function isKnownErrorCode(code: string): code is ErrorCode {
  return code in ErrorMessages
}