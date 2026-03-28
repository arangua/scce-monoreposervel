/**
 * División Político-Administrativa de Chile — datos oficiales
 * 16 Regiones · 56 Provincias · 346 Comunas
 *
 * Fuentes:
 *  - BCN / SUBDERE (estructura oficial vigente al 2026)
 *  - Decreto N°1.439 Ministerio del Interior (códigos CUT)
 *  - Ley 21.033 / 2018: creación Región de Ñuble (XVI)
 *
 * Estructura de código CUT (5 dígitos):
 *  RR PPP CC → región (2), provincia (3), comuna (5)
 *  Ejemplo: 01101 = Región Tarapacá, Provincia Iquique, Comuna Iquique
 *
 * IMPORTANTE: Este archivo es la fuente de verdad territorial del SCCE.
 * Los locales de votación se cargan por separado desde Excel (ver CatalogView).
 */

export type DpaComuna = {
  codigo: string;   // CUT 5 dígitos
  nombre: string;
};

export type DpaProvincia = {
  codigo: string;   // CUT 3 dígitos
  nombre: string;
  comunas: DpaComuna[];
};

export type DpaRegion = {
  codigo: string;   // CUT 2 dígitos
  ordinal: string;  // Romano oficial (solo referencia histórica)
  nombre: string;
  capital: string;
  provincias: DpaProvincia[];
};

export const CHILE_DPA: DpaRegion[] = [
  {
    codigo: "15", ordinal: "XV", nombre: "Arica y Parinacota", capital: "Arica",
    provincias: [
      { codigo: "151", nombre: "Arica", comunas: [
        { codigo: "15101", nombre: "Arica" },
        { codigo: "15102", nombre: "Camarones" },
      ]},
      { codigo: "152", nombre: "Parinacota", comunas: [
        { codigo: "15201", nombre: "Putre" },
        { codigo: "15202", nombre: "General Lagos" },
      ]},
    ],
  },
  {
    codigo: "01", ordinal: "I", nombre: "Tarapacá", capital: "Iquique",
    provincias: [
      { codigo: "011", nombre: "Iquique", comunas: [
        { codigo: "01101", nombre: "Iquique" },
        { codigo: "01107", nombre: "Alto Hospicio" },
      ]},
      { codigo: "014", nombre: "El Tamarugal", comunas: [
        { codigo: "01401", nombre: "Pozo Almonte" },
        { codigo: "01402", nombre: "Camiña" },
        { codigo: "01403", nombre: "Colchane" },
        { codigo: "01404", nombre: "Huara" },
        { codigo: "01405", nombre: "Pica" },
      ]},
    ],
  },
  {
    codigo: "02", ordinal: "II", nombre: "Antofagasta", capital: "Antofagasta",
    provincias: [
      { codigo: "021", nombre: "Antofagasta", comunas: [
        { codigo: "02101", nombre: "Antofagasta" },
        { codigo: "02102", nombre: "Mejillones" },
        { codigo: "02103", nombre: "Sierra Gorda" },
        { codigo: "02104", nombre: "Taltal" },
      ]},
      { codigo: "022", nombre: "El Loa", comunas: [
        { codigo: "02201", nombre: "Calama" },
        { codigo: "02202", nombre: "Ollagüe" },
        { codigo: "02203", nombre: "San Pedro de Atacama" },
      ]},
      { codigo: "023", nombre: "Tocopilla", comunas: [
        { codigo: "02301", nombre: "Tocopilla" },
        { codigo: "02302", nombre: "María Elena" },
      ]},
    ],
  },
  {
    codigo: "03", ordinal: "III", nombre: "Atacama", capital: "Copiapó",
    provincias: [
      { codigo: "031", nombre: "Copiapó", comunas: [
        { codigo: "03101", nombre: "Copiapó" },
        { codigo: "03102", nombre: "Caldera" },
        { codigo: "03103", nombre: "Tierra Amarilla" },
      ]},
      { codigo: "032", nombre: "Chañaral", comunas: [
        { codigo: "03201", nombre: "Chañaral" },
        { codigo: "03202", nombre: "Diego de Almagro" },
      ]},
      { codigo: "033", nombre: "Huasco", comunas: [
        { codigo: "03301", nombre: "Vallenar" },
        { codigo: "03302", nombre: "Alto del Carmen" },
        { codigo: "03303", nombre: "Freirina" },
        { codigo: "03304", nombre: "Huasco" },
      ]},
    ],
  },
  {
    codigo: "04", ordinal: "IV", nombre: "Coquimbo", capital: "La Serena",
    provincias: [
      { codigo: "041", nombre: "Elqui", comunas: [
        { codigo: "04101", nombre: "La Serena" },
        { codigo: "04102", nombre: "Coquimbo" },
        { codigo: "04103", nombre: "Andacollo" },
        { codigo: "04104", nombre: "La Higuera" },
        { codigo: "04105", nombre: "Paiguano" },
        { codigo: "04106", nombre: "Vicuña" },
      ]},
      { codigo: "042", nombre: "Choapa", comunas: [
        { codigo: "04201", nombre: "Illapel" },
        { codigo: "04202", nombre: "Canela" },
        { codigo: "04203", nombre: "Los Vilos" },
        { codigo: "04204", nombre: "Salamanca" },
      ]},
      { codigo: "043", nombre: "Limarí", comunas: [
        { codigo: "04301", nombre: "Ovalle" },
        { codigo: "04302", nombre: "Combarbalá" },
        { codigo: "04303", nombre: "Monte Patria" },
        { codigo: "04304", nombre: "Punitaqui" },
        { codigo: "04305", nombre: "Río Hurtado" },
      ]},
    ],
  },
  {
    codigo: "05", ordinal: "V", nombre: "Valparaíso", capital: "Valparaíso",
    provincias: [
      { codigo: "051", nombre: "Valparaíso", comunas: [
        { codigo: "05101", nombre: "Valparaíso" },
        { codigo: "05102", nombre: "Casablanca" },
        { codigo: "05103", nombre: "Concón" },
        { codigo: "05104", nombre: "Juan Fernández" },
        { codigo: "05105", nombre: "Puchuncaví" },
        { codigo: "05106", nombre: "Quintero" },
        { codigo: "05107", nombre: "Viña del Mar" },
      ]},
      { codigo: "052", nombre: "Isla de Pascua", comunas: [
        { codigo: "05201", nombre: "Isla de Pascua" },
      ]},
      { codigo: "053", nombre: "Los Andes", comunas: [
        { codigo: "05301", nombre: "Los Andes" },
        { codigo: "05302", nombre: "Calle Larga" },
        { codigo: "05303", nombre: "Rinconada" },
        { codigo: "05304", nombre: "San Esteban" },
      ]},
      { codigo: "054", nombre: "Petorca", comunas: [
        { codigo: "05401", nombre: "La Ligua" },
        { codigo: "05402", nombre: "Cabildo" },
        { codigo: "05403", nombre: "Papudo" },
        { codigo: "05404", nombre: "Petorca" },
        { codigo: "05405", nombre: "Zapallar" },
      ]},
      { codigo: "055", nombre: "Quillota", comunas: [
        { codigo: "05501", nombre: "Quillota" },
        { codigo: "05502", nombre: "Calera" },
        { codigo: "05503", nombre: "Hijuelas" },
        { codigo: "05504", nombre: "La Cruz" },
        { codigo: "05505", nombre: "Limache" },
        { codigo: "05506", nombre: "Nogales" },
        { codigo: "05507", nombre: "Olmué" },
      ]},
      { codigo: "056", nombre: "San Antonio", comunas: [
        { codigo: "05601", nombre: "San Antonio" },
        { codigo: "05602", nombre: "Algarrobo" },
        { codigo: "05603", nombre: "Cartagena" },
        { codigo: "05604", nombre: "El Quisco" },
        { codigo: "05605", nombre: "El Tabo" },
        { codigo: "05606", nombre: "Santo Domingo" },
      ]},
      { codigo: "057", nombre: "San Felipe de Aconcagua", comunas: [
        { codigo: "05701", nombre: "San Felipe" },
        { codigo: "05702", nombre: "Catemu" },
        { codigo: "05703", nombre: "Llaillay" },
        { codigo: "05704", nombre: "Panquehue" },
        { codigo: "05705", nombre: "Putaendo" },
        { codigo: "05706", nombre: "Santa María" },
      ]},
      { codigo: "058", nombre: "Marga Marga", comunas: [
        { codigo: "05801", nombre: "Quilpué" },
        { codigo: "05802", nombre: "Villa Alemana" },
      ]},
    ],
  },
  {
    codigo: "13", ordinal: "RM", nombre: "Metropolitana de Santiago", capital: "Santiago",
    provincias: [
      { codigo: "131", nombre: "Santiago", comunas: [
        { codigo: "13101", nombre: "Santiago" },
        { codigo: "13102", nombre: "Cerrillos" },
        { codigo: "13103", nombre: "Cerro Navia" },
        { codigo: "13104", nombre: "Conchalí" },
        { codigo: "13105", nombre: "El Bosque" },
        { codigo: "13106", nombre: "Estación Central" },
        { codigo: "13107", nombre: "Huechuraba" },
        { codigo: "13108", nombre: "Independencia" },
        { codigo: "13109", nombre: "La Cisterna" },
        { codigo: "13110", nombre: "La Florida" },
        { codigo: "13111", nombre: "La Granja" },
        { codigo: "13112", nombre: "La Pintana" },
        { codigo: "13113", nombre: "La Reina" },
        { codigo: "13114", nombre: "Las Condes" },
        { codigo: "13115", nombre: "Lo Barnechea" },
        { codigo: "13116", nombre: "Lo Espejo" },
        { codigo: "13117", nombre: "Lo Prado" },
        { codigo: "13118", nombre: "Macul" },
        { codigo: "13119", nombre: "Maipú" },
        { codigo: "13120", nombre: "Ñuñoa" },
        { codigo: "13121", nombre: "Pedro Aguirre Cerda" },
        { codigo: "13122", nombre: "Peñalolén" },
        { codigo: "13123", nombre: "Providencia" },
        { codigo: "13124", nombre: "Pudahuel" },
        { codigo: "13125", nombre: "Quilicura" },
        { codigo: "13126", nombre: "Quinta Normal" },
        { codigo: "13127", nombre: "Recoleta" },
        { codigo: "13128", nombre: "Renca" },
        { codigo: "13129", nombre: "San Miguel" },
        { codigo: "13130", nombre: "San Joaquín" },
        { codigo: "13131", nombre: "San Ramón" },
        { codigo: "13132", nombre: "Vitacura" },
      ]},
      { codigo: "132", nombre: "Cordillera", comunas: [
        { codigo: "13201", nombre: "Puente Alto" },
        { codigo: "13202", nombre: "Pirque" },
        { codigo: "13203", nombre: "San José de Maipo" },
      ]},
      { codigo: "133", nombre: "Chacabuco", comunas: [
        { codigo: "13301", nombre: "Colina" },
        { codigo: "13302", nombre: "Lampa" },
        { codigo: "13303", nombre: "Tiltil" },
      ]},
      { codigo: "134", nombre: "Maipo", comunas: [
        { codigo: "13401", nombre: "San Bernardo" },
        { codigo: "13402", nombre: "Buin" },
        { codigo: "13403", nombre: "Calera de Tango" },
        { codigo: "13404", nombre: "Paine" },
      ]},
      { codigo: "135", nombre: "Melipilla", comunas: [
        { codigo: "13501", nombre: "Melipilla" },
        { codigo: "13502", nombre: "Alhué" },
        { codigo: "13503", nombre: "Curacaví" },
        { codigo: "13504", nombre: "María Pinto" },
        { codigo: "13505", nombre: "San Pedro" },
      ]},
      { codigo: "136", nombre: "Talagante", comunas: [
        { codigo: "13601", nombre: "Talagante" },
        { codigo: "13602", nombre: "El Monte" },
        { codigo: "13603", nombre: "Isla de Maipo" },
        { codigo: "13604", nombre: "Padre Hurtado" },
        { codigo: "13605", nombre: "Peñaflor" },
      ]},
    ],
  },
  {
    codigo: "06", ordinal: "VI", nombre: "Libertador General Bernardo O'Higgins", capital: "Rancagua",
    provincias: [
      { codigo: "061", nombre: "Cachapoal", comunas: [
        { codigo: "06101", nombre: "Rancagua" },
        { codigo: "06102", nombre: "Codegua" },
        { codigo: "06103", nombre: "Coinco" },
        { codigo: "06104", nombre: "Coltauco" },
        { codigo: "06105", nombre: "Doñihue" },
        { codigo: "06106", nombre: "Graneros" },
        { codigo: "06107", nombre: "Las Cabras" },
        { codigo: "06108", nombre: "Machalí" },
        { codigo: "06109", nombre: "Malloa" },
        { codigo: "06110", nombre: "Mostazal" },
        { codigo: "06111", nombre: "Olivar" },
        { codigo: "06112", nombre: "Peumo" },
        { codigo: "06113", nombre: "Pichidegua" },
        { codigo: "06114", nombre: "Quinta de Tilcoco" },
        { codigo: "06115", nombre: "Rengo" },
        { codigo: "06116", nombre: "Requínoa" },
        { codigo: "06117", nombre: "San Vicente de Tagua Tagua" },
      ]},
      { codigo: "062", nombre: "Cardenal Caro", comunas: [
        { codigo: "06201", nombre: "Pichilemu" },
        { codigo: "06202", nombre: "La Estrella" },
        { codigo: "06203", nombre: "Litueche" },
        { codigo: "06204", nombre: "Marchihue" },
        { codigo: "06205", nombre: "Navidad" },
        { codigo: "06206", nombre: "Paredones" },
      ]},
      { codigo: "063", nombre: "Colchagua", comunas: [
        { codigo: "06301", nombre: "San Fernando" },
        { codigo: "06302", nombre: "Chépica" },
        { codigo: "06303", nombre: "Chimbarongo" },
        { codigo: "06304", nombre: "Lolol" },
        { codigo: "06305", nombre: "Nancagua" },
        { codigo: "06306", nombre: "Palmilla" },
        { codigo: "06307", nombre: "Peralillo" },
        { codigo: "06308", nombre: "Placilla" },
        { codigo: "06309", nombre: "Pumanque" },
        { codigo: "06310", nombre: "Santa Cruz" },
      ]},
    ],
  },
  {
    codigo: "07", ordinal: "VII", nombre: "Maule", capital: "Talca",
    provincias: [
      { codigo: "071", nombre: "Talca", comunas: [
        { codigo: "07101", nombre: "Talca" },
        { codigo: "07102", nombre: "Constitución" },
        { codigo: "07103", nombre: "Curepto" },
        { codigo: "07104", nombre: "Empedrado" },
        { codigo: "07105", nombre: "Maule" },
        { codigo: "07106", nombre: "Pelarco" },
        { codigo: "07107", nombre: "Pencahue" },
        { codigo: "07108", nombre: "Río Claro" },
        { codigo: "07109", nombre: "San Clemente" },
        { codigo: "07110", nombre: "San Rafael" },
      ]},
      { codigo: "072", nombre: "Cauquenes", comunas: [
        { codigo: "07201", nombre: "Cauquenes" },
        { codigo: "07202", nombre: "Chanco" },
        { codigo: "07203", nombre: "Pelluhue" },
      ]},
      { codigo: "073", nombre: "Curicó", comunas: [
        { codigo: "07301", nombre: "Curicó" },
        { codigo: "07302", nombre: "Hualañé" },
        { codigo: "07303", nombre: "Licantén" },
        { codigo: "07304", nombre: "Molina" },
        { codigo: "07305", nombre: "Rauco" },
        { codigo: "07306", nombre: "Romeral" },
        { codigo: "07307", nombre: "Sagrada Familia" },
        { codigo: "07308", nombre: "Teno" },
        { codigo: "07309", nombre: "Vichuquén" },
      ]},
      { codigo: "074", nombre: "Linares", comunas: [
        { codigo: "07401", nombre: "Linares" },
        { codigo: "07402", nombre: "Colbún" },
        { codigo: "07403", nombre: "Longaví" },
        { codigo: "07404", nombre: "Parral" },
        { codigo: "07405", nombre: "Retiro" },
        { codigo: "07406", nombre: "San Javier" },
        { codigo: "07407", nombre: "Villa Alegre" },
        { codigo: "07408", nombre: "Yerbas Buenas" },
      ]},
    ],
  },
  {
    codigo: "16", ordinal: "XVI", nombre: "Ñuble", capital: "Chillán",
    provincias: [
      { codigo: "161", nombre: "Diguillín", comunas: [
        { codigo: "16101", nombre: "Chillán" },
        { codigo: "16102", nombre: "Bulnes" },
        { codigo: "16103", nombre: "Chillán Viejo" },
        { codigo: "16104", nombre: "El Carmen" },
        { codigo: "16105", nombre: "Pemuco" },
        { codigo: "16106", nombre: "Pinto" },
        { codigo: "16107", nombre: "Quillón" },
        { codigo: "16108", nombre: "San Ignacio" },
        { codigo: "16109", nombre: "Yungay" },
      ]},
      { codigo: "162", nombre: "Itata", comunas: [
        { codigo: "16201", nombre: "Cobquecura" },
        { codigo: "16202", nombre: "Coelemu" },
        { codigo: "16203", nombre: "Ninhue" },
        { codigo: "16204", nombre: "Portezuelo" },
        { codigo: "16205", nombre: "Quirihue" },
        { codigo: "16206", nombre: "Ránquil" },
        { codigo: "16207", nombre: "Trehuaco" },
      ]},
      { codigo: "163", nombre: "Punilla", comunas: [
        { codigo: "16301", nombre: "San Carlos" },
        { codigo: "16302", nombre: "Coihueco" },
        { codigo: "16303", nombre: "Ñiquén" },
        { codigo: "16304", nombre: "San Fabián" },
        { codigo: "16305", nombre: "San Nicolás" },
      ]},
    ],
  },
  {
    codigo: "08", ordinal: "VIII", nombre: "Biobío", capital: "Concepción",
    provincias: [
      { codigo: "081", nombre: "Concepción", comunas: [
        { codigo: "08101", nombre: "Concepción" },
        { codigo: "08102", nombre: "Coronel" },
        { codigo: "08103", nombre: "Chiguayante" },
        { codigo: "08104", nombre: "Florida" },
        { codigo: "08105", nombre: "Hualpén" },
        { codigo: "08106", nombre: "Hualqui" },
        { codigo: "08107", nombre: "Lota" },
        { codigo: "08108", nombre: "Penco" },
        { codigo: "08109", nombre: "San Pedro de la Paz" },
        { codigo: "08110", nombre: "Santa Juana" },
        { codigo: "08111", nombre: "Talcahuano" },
        { codigo: "08112", nombre: "Tomé" },
      ]},
      { codigo: "082", nombre: "Arauco", comunas: [
        { codigo: "08201", nombre: "Lebu" },
        { codigo: "08202", nombre: "Arauco" },
        { codigo: "08203", nombre: "Cañete" },
        { codigo: "08204", nombre: "Contulmo" },
        { codigo: "08205", nombre: "Curanilahue" },
        { codigo: "08206", nombre: "Los Álamos" },
        { codigo: "08207", nombre: "Tirúa" },
      ]},
      { codigo: "083", nombre: "Biobío", comunas: [
        { codigo: "08301", nombre: "Los Ángeles" },
        { codigo: "08302", nombre: "Antuco" },
        { codigo: "08303", nombre: "Cabrero" },
        { codigo: "08304", nombre: "Laja" },
        { codigo: "08305", nombre: "Mulchén" },
        { codigo: "08306", nombre: "Nacimiento" },
        { codigo: "08307", nombre: "Negrete" },
        { codigo: "08308", nombre: "Quilaco" },
        { codigo: "08309", nombre: "Quilleco" },
        { codigo: "08310", nombre: "San Rosendo" },
        { codigo: "08311", nombre: "Santa Bárbara" },
        { codigo: "08312", nombre: "Tucapel" },
        { codigo: "08313", nombre: "Yumbel" },
        { codigo: "08314", nombre: "Alto Biobío" },
      ]},
    ],
  },
  {
    codigo: "09", ordinal: "IX", nombre: "La Araucanía", capital: "Temuco",
    provincias: [
      { codigo: "091", nombre: "Cautín", comunas: [
        { codigo: "09101", nombre: "Temuco" },
        { codigo: "09102", nombre: "Carahue" },
        { codigo: "09103", nombre: "Cholchol" },
        { codigo: "09104", nombre: "Cunco" },
        { codigo: "09105", nombre: "Curarrehue" },
        { codigo: "09106", nombre: "Freire" },
        { codigo: "09107", nombre: "Galvarino" },
        { codigo: "09108", nombre: "Gorbea" },
        { codigo: "09109", nombre: "Lautaro" },
        { codigo: "09110", nombre: "Loncoche" },
        { codigo: "09111", nombre: "Melipeuco" },
        { codigo: "09112", nombre: "Nueva Imperial" },
        { codigo: "09113", nombre: "Padre Las Casas" },
        { codigo: "09114", nombre: "Perquenco" },
        { codigo: "09115", nombre: "Pitrufquén" },
        { codigo: "09116", nombre: "Pucón" },
        { codigo: "09117", nombre: "Saavedra" },
        { codigo: "09118", nombre: "Teodoro Schmidt" },
        { codigo: "09119", nombre: "Toltén" },
        { codigo: "09120", nombre: "Vilcún" },
        { codigo: "09121", nombre: "Villarrica" },
      ]},
      { codigo: "092", nombre: "Malleco", comunas: [
        { codigo: "09201", nombre: "Angol" },
        { codigo: "09202", nombre: "Collipulli" },
        { codigo: "09203", nombre: "Curacautín" },
        { codigo: "09204", nombre: "Ercilla" },
        { codigo: "09205", nombre: "Lonquimay" },
        { codigo: "09206", nombre: "Los Sauces" },
        { codigo: "09207", nombre: "Lumaco" },
        { codigo: "09208", nombre: "Purén" },
        { codigo: "09209", nombre: "Renaico" },
        { codigo: "09210", nombre: "Traiguén" },
        { codigo: "09211", nombre: "Victoria" },
      ]},
    ],
  },
  {
    codigo: "14", ordinal: "XIV", nombre: "Los Ríos", capital: "Valdivia",
    provincias: [
      { codigo: "141", nombre: "Valdivia", comunas: [
        { codigo: "14101", nombre: "Valdivia" },
        { codigo: "14102", nombre: "Corral" },
        { codigo: "14103", nombre: "Lanco" },
        { codigo: "14104", nombre: "Los Lagos" },
        { codigo: "14105", nombre: "Máfil" },
        { codigo: "14106", nombre: "Mariquina" },
        { codigo: "14107", nombre: "Paillaco" },
        { codigo: "14108", nombre: "Panguipulli" },
      ]},
      { codigo: "142", nombre: "Ranco", comunas: [
        { codigo: "14201", nombre: "La Unión" },
        { codigo: "14202", nombre: "Futrono" },
        { codigo: "14203", nombre: "Lago Ranco" },
        { codigo: "14204", nombre: "Río Bueno" },
      ]},
    ],
  },
  {
    codigo: "10", ordinal: "X", nombre: "Los Lagos", capital: "Puerto Montt",
    provincias: [
      { codigo: "101", nombre: "Llanquihue", comunas: [
        { codigo: "10101", nombre: "Puerto Montt" },
        { codigo: "10102", nombre: "Calbuco" },
        { codigo: "10103", nombre: "Cochamó" },
        { codigo: "10104", nombre: "Fresia" },
        { codigo: "10105", nombre: "Frutillar" },
        { codigo: "10106", nombre: "Los Muermos" },
        { codigo: "10107", nombre: "Llanquihue" },
        { codigo: "10108", nombre: "Maullín" },
        { codigo: "10109", nombre: "Puerto Varas" },
      ]},
      { codigo: "102", nombre: "Chiloé", comunas: [
        { codigo: "10201", nombre: "Castro" },
        { codigo: "10202", nombre: "Ancud" },
        { codigo: "10203", nombre: "Chonchi" },
        { codigo: "10204", nombre: "Curaco de Vélez" },
        { codigo: "10205", nombre: "Dalcahue" },
        { codigo: "10206", nombre: "Puqueldón" },
        { codigo: "10207", nombre: "Queilén" },
        { codigo: "10208", nombre: "Quellón" },
        { codigo: "10209", nombre: "Quemchi" },
        { codigo: "10210", nombre: "Quinchao" },
      ]},
      { codigo: "103", nombre: "Osorno", comunas: [
        { codigo: "10301", nombre: "Osorno" },
        { codigo: "10302", nombre: "Puerto Octay" },
        { codigo: "10303", nombre: "Purranque" },
        { codigo: "10304", nombre: "Puyehue" },
        { codigo: "10305", nombre: "Río Negro" },
        { codigo: "10306", nombre: "San Juan de la Costa" },
        { codigo: "10307", nombre: "San Pablo" },
      ]},
      { codigo: "104", nombre: "Palena", comunas: [
        { codigo: "10401", nombre: "Chaitén" },
        { codigo: "10402", nombre: "Futaleufú" },
        { codigo: "10403", nombre: "Hualaihué" },
        { codigo: "10404", nombre: "Palena" },
      ]},
    ],
  },
  {
    codigo: "11", ordinal: "XI", nombre: "Aysén del General Carlos Ibáñez del Campo", capital: "Coyhaique",
    provincias: [
      { codigo: "111", nombre: "Coyhaique", comunas: [
        { codigo: "11101", nombre: "Coyhaique" },
        { codigo: "11102", nombre: "Lago Verde" },
      ]},
      { codigo: "112", nombre: "Aysén", comunas: [
        { codigo: "11201", nombre: "Aysén" },
        { codigo: "11202", nombre: "Cisnes" },
        { codigo: "11203", nombre: "Guaitecas" },
      ]},
      { codigo: "113", nombre: "Capitán Prat", comunas: [
        { codigo: "11301", nombre: "Cochrane" },
        { codigo: "11302", nombre: "O'Higgins" },
        { codigo: "11303", nombre: "Tortel" },
      ]},
      { codigo: "114", nombre: "General Carrera", comunas: [
        { codigo: "11401", nombre: "Chile Chico" },
        { codigo: "11402", nombre: "Río Ibáñez" },
      ]},
    ],
  },
  {
    codigo: "12", ordinal: "XII", nombre: "Magallanes y de la Antártica Chilena", capital: "Punta Arenas",
    provincias: [
      { codigo: "121", nombre: "Magallanes", comunas: [
        { codigo: "12101", nombre: "Punta Arenas" },
        { codigo: "12102", nombre: "Laguna Blanca" },
        { codigo: "12103", nombre: "Río Verde" },
        { codigo: "12104", nombre: "San Gregorio" },
      ]},
      { codigo: "122", nombre: "Antártica Chilena", comunas: [
        { codigo: "12201", nombre: "Cabo de Hornos" },
        { codigo: "12202", nombre: "Antártica" },
      ]},
      { codigo: "123", nombre: "Tierra del Fuego", comunas: [
        { codigo: "12301", nombre: "Porvenir" },
        { codigo: "12302", nombre: "Primavera" },
        { codigo: "12303", nombre: "Timaukel" },
      ]},
      { codigo: "124", nombre: "Última Esperanza", comunas: [
        { codigo: "12401", nombre: "Natales" },
        { codigo: "12402", nombre: "Torres del Paine" },
      ]},
    ],
  },
];

// ── Helpers de acceso rápido ───────────────────────────────────────────────────

export function dpaGetRegion(codigo: string): DpaRegion | undefined {
  return CHILE_DPA.find(r => r.codigo === codigo);
}

export function dpaGetRegionByCodigo(codigo: string): DpaRegion | undefined {
  return CHILE_DPA.find(r => r.codigo === codigo);
}

export function dpaGetComunasByRegion(codigoRegion: string): DpaComuna[] {
  const region = dpaGetRegion(codigoRegion);
  if (!region) return [];
  return region.provincias.flatMap(p => p.comunas);
}

export function dpaGetComunasByProvincia(codigoProvincia: string): DpaComuna[] {
  const codigoRegion = codigoProvincia.slice(0, 2);
  const region = dpaGetRegion(codigoRegion);
  return region?.provincias.find(p => p.codigo === codigoProvincia)?.comunas ?? [];
}

export function dpaNombreRegion(codigo: string): string {
  return dpaGetRegion(codigo)?.nombre ?? codigo;
}

export function dpaNombreComuna(codigoRegion: string, codigoComuna: string): string {
  const comunas = dpaGetComunasByRegion(codigoRegion);
  return comunas.find(c => c.codigo === codigoComuna)?.nombre ?? codigoComuna;
}

/** Mapa plano de todas las comunas para búsqueda rápida por código */
export const DPA_COMUNAS_MAP: Map<string, DpaComuna & { regionCodigo: string; provinciaCodigo: string }> = new Map(
  CHILE_DPA.flatMap(r =>
    r.provincias.flatMap(p =>
      p.comunas.map(c => [c.codigo, { ...c, regionCodigo: r.codigo, provinciaCodigo: p.codigo }])
    )
  )
);
