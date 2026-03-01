export type ViewKey =
  | "dashboard"
  | "op_home"
  | "catalog"
  | "audit"
  | "reports"
  | "simulation"
  | "checklist"
  | "config"
  | "trust"
  | "new_case"
  | "detail";

export type HelpBlock = {
  title: string;
  purpose: string;
  quickSteps: string[];
  commonIssues?: string[];
};

export const helpByView: Record<ViewKey, HelpBlock> = {
  dashboard: {
    title: "Inicio",
    purpose:
      "Aquí ves el estado general del sistema y los indicadores principales.",
    quickSteps: [
      "Revisa los números principales.",
      "Observa si hay alertas o situaciones pendientes.",
      "Usa las pestañas superiores para ir al módulo que necesites."
    ]
  },

  op_home: {
    title: "Modo Operativo — Inicio",
    purpose: "Vista de terreno: casos del local asignado y respuestas recibidas.",
    quickSteps: [
      "Selecciona un caso de la izquierda para ver detalle.",
      "Usa + Nuevo incidente para registrar un incidente.",
      "Usa Volver para regresar a esta pantalla."
    ]
  },

  catalog: {
    title: "Catálogo",
    purpose:
      "Aquí puedes revisar la información registrada en el sistema.",
    quickSteps: [
      "Busca el registro que necesites.",
      "Revisa los datos antes de crear uno nuevo.",
      "Evita duplicar información ya existente."
    ]
  },

  audit: {
    title: "Historial",
    purpose:
      "Aquí puedes ver todo lo que ha ocurrido en el sistema.",
    quickSteps: [
      "Revisa qué acciones se realizaron y cuándo.",
      "Usa esta vista para aclarar dudas o revisar situaciones anteriores.",
      "Si necesitas respaldo, puedes descargarlo desde Reportes."
    ]
  },

  reports: {
    title: "Respaldos",
    purpose:
      "Aquí puedes guardar un respaldo del sistema o cargar uno que te hayan enviado.",
    quickSteps: [
      "Descargar lista de casos en Excel.",
      "Descargar respaldo completo del sistema.",
      "Cargar un respaldo oficial cuando sea necesario."
    ],
    commonIssues: [
      "Si el sistema detecta un problema, no cargará el archivo para evitar errores.",
      "Si no se puede cargar, el archivo puede estar dañado o no corresponde a este sistema."
    ]
  },

  simulation: {
    title: "Simulación",
    purpose:
      "Aquí puedes practicar el uso del sistema antes de una situación real.",
    quickSteps: [
      "Selecciona el escenario de práctica.",
      "Registra acciones como si fuera una situación real.",
      "Revisa el resultado para aprender del ejercicio."
    ]
  },

  checklist: {
    title: "Lista de verificación",
    purpose:
      "Aquí puedes revisar tareas importantes que deben completarse.",
    quickSteps: [
      "Marca las tareas completadas.",
      "Revisa las que estén pendientes.",
      "No cierres una tarea sin verificar que esté realmente terminada."
    ]
  },

  config: {
    title: "Configuración",
    purpose:
      "Aquí se encuentran las opciones especiales del sistema.",
    quickSteps: [
      "Usa estas opciones solo cuando sea necesario.",
      "Lee con atención antes de ejecutar acciones importantes.",
      "Si vas a hacer una demostración, puedes reiniciar el sistema de prueba."
    ],
    commonIssues: [
      "Reiniciar el sistema elimina los datos de demostración actuales.",
      "No uses estas opciones durante una operación real."
    ]
  },

  new_case: {
    title: "Nuevo incidente (Ficha 60s)",
    purpose:
      "Registrar un incidente en menos de 60 segundos con lo esencial y trazabilidad.",
    quickSteps: [
      "Completa Identificación y un resumen claro.",
      "Define la evaluación (impacto/continuidad/seguridad).",
      "Agrega evidencia si existe (foto, acta, llamada).",
      "Confirma y guarda."
    ]
  },

  detail: {
    title: "Detalle del incidente",
    purpose:
      "Revisar estado, seguimiento y acciones registradas del incidente.",
    quickSteps: [
      "Revisa el historial y decisiones.",
      "Verifica evidencia y responsables.",
      "Actualiza estado si corresponde."
    ]
  },

  trust: {
    title: "Firma y confianza",
    purpose: "Ver estado de verificación de autoría, llave local y lista de firmantes confiables.",
    quickSteps: [
      "Revisa si la verificación está disponible y si tienes llave configurada.",
      "Agrega o quita firmantes confiables según necesidad.",
      "Al importar, un firmante confiable evita tener que escribir CONFIAR."
    ]
  }
};
