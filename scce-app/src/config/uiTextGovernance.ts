/**
 * Catálogo oficial de textos visibles para gobernanza, recomendaciones y auditoría.
 * Español claro; sin cambiar lógica ni keys internos.
 */

export const UI_TEXT_GOVERNANCE = {
  sections: {
    governance: "Gobernanza del incidente",
    recommendation: "Siguiente paso recomendado",
    recommendationReason: "Motivo",
    audit: "Registro del incidente",
    auditTechnical: "Auditoría técnica",
    incidentClassification: "Clasificación del incidente",
    incidentProgress: "Progreso del incidente",
    timeline: "Línea de tiempo",
    actions: "Acciones",
    decisions: "Decisiones",
  },

  fields: {
    incidentType: "Tipo de incidente",
    criticality: "Criticidad",
    governanceStage: "Estado institucional",
    activeCommandLevel: "Nivel de gestión actual",
    activeCommanderRole: "Responsable actual del caso",
    requiresEscalation: "Requiere escalamiento",
    closureAuthority: "Autoridad requerida para cierre",
    operationalValidation: "Validación operacional",
    closeReason: "Motivo de cierre",
    commandAssignedAt: "Responsable asignado desde",
    escalatedAt: "Escalado el",
    currentStatus: "Estado actual",
  },

  yesNo: {
    yes: "Sí",
    no: "No",
  },

  criticality: {
    C1_LOW: "Baja",
    C2_MEDIUM: "Media",
    C3_HIGH: "Alta",
    C4_CRITICAL: "Crítica",
  },

  incidentType: {
    LOGISTICAL: "Logístico",
    ELECTORAL_PROCEDURE: "Procedimiento electoral",
    INFRASTRUCTURE: "Infraestructura",
    TECHNOLOGY: "Tecnológico",
    PUBLIC_ORDER: "Orden público",
    LEGAL: "Jurídico / normativo",
    COMMUNICATION: "Comunicacional",
    OTHER: "Otro",
  },

  governanceStage: {
    OPEN: "Abierto",
    IN_ASSESSMENT: "En evaluación",
    IN_PROGRESS: "En gestión",
    ESCALATED: "Escalado",
    RESOLVED: "Resuelto operativamente",
    OPERATIONAL_VALIDATED: "Validado operacionalmente",
    CLOSED: "Cerrado",
  },

  commandLevel: {
    LOCAL: "Local",
    TERRITORIAL: "Territorial",
    REGIONAL: "Regional",
    CENTRAL: "Central",
  },

  institutionalRole: {
    PESE: "PESE",
    DELEGADO_JE: "Delegado Junta Electoral",
    DR_EVENTUAL: "DR Eventual",
    REGISTRO_SCCE: "Registro SCCE",
    JEFE_OPS: "Jefe de Operaciones",
    ENCARGADO_GASTO: "Encargado de Gasto",
    DIRECTOR_REGIONAL: "Director Regional",
    NIVEL_CENTRAL: "Nivel Central",
    ADMIN_PILOTO: "Admin Piloto",
    DR: "Director Regional",
    EQUIPO_REGIONAL: "Equipo Regional",
  },

  eventLabels: {
    CASE_CREATED: "Se creó el caso",
    CRITICALITY_SET: "Se definió la criticidad",
    INCIDENT_TYPE_SET: "Se definió el tipo de incidente",
    COMMAND_ASSIGNED: "Se asignó responsable del caso",
    COMMAND_TRANSFERRED: "Se cambió el responsable del caso",
    ACTION_ADDED: "Se registró una acción",
    INSTRUCTION_CREATED: "Se registró una instrucción",
    COMMENT_ADDED: "Se agregó un comentario",
    ESCALATION_REGISTERED: "Se escaló el caso",
    STATUS_CHANGED: "Se cambió el estado del caso",
    OPERATIONAL_VALIDATION: "Se registró la validación operacional",
    CLOSE_REASON_ADDED: "Se registró el motivo de cierre",
    CASE_CLOSED: "Se cerró el caso",
    BYPASS_USED: "Se usó una excepción de procedimiento",
    DECISION_ADDED: "Se registró una decisión",
    CASE_UPDATED: "Se actualizó la información del caso",
    BYPASS_FLAGGED: "Se marcó excepción para validación",
    INSTRUCTION_BYPASS_USED: "Se usó excepción en instrucción",
    EXPORT_DONE: "Se exportó estado",
    REASSESSMENT: "Se reevaluó el caso",
    ASSIGNED: "Se asignó responsable",
    LOGIN: "Inicio de sesión",
    ESCALATED: "Se escaló el caso",
    BYPASS_VALIDATED: "Se validó la excepción",
    BYPASS_REVOKED: "Se revocó la excepción",
    LOCAL_CREATED: "Se creó local en catálogo",
    LOCAL_DEACTIVATED: "Se desactivó local",
    LOCAL_REACTIVATED: "Se reactivó local",
    LOCAL_ELECTION_TOGGLED: "Se cambió activación en elección",
  },

  /** Resumen legible cuando el resumen almacenado es genérico o vacío */
  auditSummaryFallback: {
    default: "Evento registrado",
    login: "Inicio de sesión",
    empty: "—",
  },

  eventResults: {
    caseOpened: "Caso abierto",
    caseInProgress: "Caso en gestión",
    caseEscalated: "Caso escalado",
    caseResolved: "Caso resuelto operativamente",
    caseValidated: "Operación restablecida",
    caseClosed: "Caso cerrado correctamente",
  },

  recommendationTitles: {
    SET_CRITICALITY: "Definir criticidad",
    SET_INCIDENT_TYPE: "Definir tipo de incidente",
    ASSIGN_COMMAND: "Asignar responsable del caso",
    TRANSFER_COMMAND: "Cambiar responsable del caso",
    REGISTER_ACTION: "Registrar acción ejecutada",
    REGISTER_INSTRUCTION: "Registrar instrucción formal",
    ESCALATE_TO_DELEGADO: "Escalar a Delegado Junta Electoral",
    ESCALATE_TO_DR: "Escalar a Director Regional",
    ESCALATE_TO_CENTRAL: "Escalar a Nivel Central",
    VALIDATE_OPERATION: "Registrar validación operacional",
    ADD_CLOSE_REASON: "Registrar motivo de cierre",
    CLOSE_CASE: "Cerrar caso",
  },

  recommendationMessages: {
    SET_CRITICALITY: "Este caso aún no tiene criticidad definida.",
    SET_INCIDENT_TYPE: "Este caso aún no tiene tipo de incidente definido.",
    ASSIGN_COMMAND: "Este caso aún no tiene un responsable de conducción asignado.",
    TRANSFER_COMMAND: "La conducción del caso debe cambiar al nivel que corresponde.",
    REGISTER_ACTION: "Falta registrar al menos una acción ejecutada.",
    REGISTER_INSTRUCTION: "Conviene dejar constancia de una instrucción formal.",
    ESCALATE_TO_DELEGADO: "Este caso debe ser conocido por Delegado Junta Electoral.",
    ESCALATE_TO_DR: "La criticidad del caso exige conducción regional activa.",
    ESCALATE_TO_CENTRAL: "Este caso requiere escalamiento a Nivel Central.",
    VALIDATE_OPERATION: "Antes del cierre debe confirmarse que la operación fue normalizada.",
    ADD_CLOSE_REASON: "Antes del cierre debe registrarse el motivo de cierre.",
    CLOSE_CASE: "El caso cumple las condiciones para cierre institucional.",
  },

  recommendationReasons: {
    highCriticalityNeedsRegionalCommand: "La criticidad alta exige conducción regional activa.",
    criticalNeedsCentralCommand: "La criticidad crítica exige conducción de Nivel Central.",
    missingAction: "No existe una acción registrada en el caso.",
    missingValidation: "Aún no se ha registrado la validación operacional.",
    missingCloseReason: "Aún no se ha registrado el motivo de cierre.",
    missingCommand: "Aún no se ha definido quién conduce el caso.",
    missingIncidentType: "Aún no se ha definido la naturaleza del incidente.",
    missingCriticality: "Aún no se ha definido la gravedad del incidente.",
  },

  validationMessages: {
    cannotCloseYet: "No es posible cerrar el caso todavía.",
    enterCloseReason: "Ingresa el motivo.",
    justificationRequired: "Justificación obligatoria.",
    missingAction: "Falta registrar una acción.",
    missingOperationalValidation: "Falta la validación operacional.",
    missingCloseReason: "Falta registrar el motivo de cierre.",
    missingCriticality: "Falta definir la criticidad del caso.",
    missingIncidentType: "Falta definir el tipo de incidente.",
    missingCommand: "Falta asignar un responsable actual del caso.",
    roleNotAllowedForClosure: "Su rol no tiene atribuciones para cerrar este caso.",
    regionalClosureRequired: "Este caso debe ser cerrado a nivel regional.",
    centralClosureRequired: "Este caso debe ser cerrado a nivel central.",
    escalationRequired: "Este caso requiere escalamiento antes de continuar.",
    invalidCommandLevelForClosure:
      "El nivel de gestión actual no es compatible con el cierre de este caso.",
  },

  helperText: {
    governanceSummary:
      "Este bloque muestra quién conduce el caso, su criticidad y el nivel institucional requerido para gestionarlo correctamente.",
    recommendationSummary: "El sistema sugiere el siguiente paso más útil según el estado del caso.",
    auditSummary: "Aquí se muestra la secuencia de hechos relevantes del incidente en lenguaje simple.",
    auditTechnicalSummary: "Esta sección conserva el detalle técnico de auditoría para revisión especializada.",
    divergenceLegalNote:
      "El caso es jurídicamente válido. Verificar disponibilidad del local y registrar acción si corresponde.",
  },

  badges: {
    urgent: "Urgente",
    high: "Alta prioridad",
    medium: "Prioridad media",
    low: "Prioridad baja",
    valid: "Válido",
    rejected: "Rechazado",
    pending: "Pendiente",
    completed: "Completado",
  },

  buttons: {
    closeCase: "Cerrar caso",
    validateOperation: "Registrar validación operacional",
    addAction: "Registrar acción",
    addActionShort: "+ Acción",
    addDecisionShort: "+ Decisión",
    addInstruction: "Registrar instrucción",
    escalate: "Escalar caso",
    assignCommand: "Asignar responsable",
    transferCommand: "Cambiar responsable",
    addCloseReason: "Registrar motivo de cierre",
    saveCloseReason: "Guardar motivo",
    updateCloseReason: "✓ Actualizar",
    registerReevaluation: "Registrar Reevaluación",
    registerIncident: "✓ Registrar Incidente",
  },

  placeholders: {
    closeReason: "Escriba el motivo de cierre",
    actionDetail: "Describa la acción realizada",
    actionShort: "Acción...",
    decisionFundament: "Fundamento de decisión...",
    reevaluationFundament: "Fundamento...",
    instructionDetail: "Describa la instrucción",
    commentDetail: "Escriba un comentario útil para el caso",
    escalationReason: "Explique por qué este caso debe escalarse",
  },

  successMessages: {
    closeReasonSaved: "Motivo guardado",
    actionSaved: "Acción registrada",
    decisionSaved: "Decisión registrada",
    operationalValidationSaved: "Validación operativa registrada",
    commandAssigned: "Responsable asignado",
  },

  checklist: {
    atLeastOneAction: "Al menos 1 acción",
    atLeastOneDecision: "Al menos 1 decisión",
    statusResolved: "Estado = Resuelto",
    operationalValidation: "Validación operativa",
    closeReasonSaved: "Motivo guardado",
    bypassResolved: "Bypass resuelto",
  },

  emptyStates: {
    noRecommendations: "No hay recomendaciones pendientes.",
    noAuditEvents: "Aún no hay eventos registrados.",
    noCommandAssigned: "Sin responsable asignado",
    noCloseReason: "Sin motivo de cierre registrado",
    noOperationalValidation: "Sin validación operacional registrada",
    noSummary: "Sin resumen",
    noLocation: "Ubicación no indicada",
  },
} as const;
