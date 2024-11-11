const fs = require("fs")
const { validateLocaleAndSetLanguage } = require("typescript")

const horariosPermitidos = ["06:30:00","07:00:00","07:30:00","08:00:00","08:30:00","09:00:00","09:30:00","10:00:00","10:30:00","11:00:00","11:30:00","12:00:00","12:30:00","13:00:00","13:30:00","14:00:00","14:30:00","15:00:00","15:30:00","16:00:00","16:30:00","17:00:00","17:30:00","18:00:00","18:30:00","19:00:00","19:30:00","20:00:00","20:30:00","21:00:00","21:30:00","22:00:00","22:30:00","23:00:00","23:30:00","00:00:00","00:30:00","01:00:00","01:30:00","02:00:00","02:30:00","03:00:00","03:30:00","04:00:00","04:30:00","05:00:00","05:30:00","06:00:00"];


const dataSotAsyncrono = fs.readdirSync('./datasot','utf8')

const janeiro = fs.readdirSync(`./datasot/${dataSotAsyncrono}`,'utf8')

const janeiroFiltrado = janeiro.filter(
    (nomeDoArquivo) => nomeDoArquivo.includes("_sect_config.csv")
)

const leituraDoscsv = fs.readFileSync(`./datasot/${dataSotAsyncrono}/${janeiroFiltrado[0]}`,"utf8")

const csvSplitadoPorLinhas = leituraDoscsv.split("\n").map(linha=>linha.split(';'));

/*
ideia antiga 
 const filteredBy30Minutes =  csvSplitadoPorLinhas.filter((linha,i)=>{
    const [semana,dia,hora,...resto] = linha
    const hasHora = hora !== undefined

    const temDoisPontos =  hasHora ? hora.includes(":") : false
    const [horaa,minuto,segundos] =  temDoisPontos ? hora.split(":") : ["","",""] 
    const temHorarioPermitido = horariosPermitidos.includes(hora)
    
    if (temHorarioPermitido){
    return linha
    }
})
   
*/

/* ideia nova */

const arrayStartingWith3And0 = [];
let ultimoHorario = ''

for ( const linha of csvSplitadoPorLinhas ) {
    const [semana,dia,hora,...resto] = linha
    if(hora) {
    if(ultimoHorario !== hora && (hora[3] === "3" || hora[3] === "0")) {
        ultimoHorario = hora
        arrayStartingWith3And0.push([...linha])
    }}
}

const filteredBy30Minutes = arrayStartingWith3And0.filter(linha => horariosPermitidos.includes(linha[2])) //horario zulu









