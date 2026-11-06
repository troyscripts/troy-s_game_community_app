const presets = require('../config/governmentDepartments.json');
const descriptions = {
 politie: [
  'Neem contact op met de korpsleiding.', 'Vragen of overleg met de teamchefs.',
  'Vragen over operationele begeleiding en training.', 'Vragen voor de leiding van Algemene Zaken.',
  'Vragen of overleg met de rechercheleiding.', 'Administratieve vragen of wijzigingen.',
  'Meldingen of vragen voor Interne Zaken.', 'Overleg met de leiding van IBT.',
  'Vragen over IBT en trainingen.', 'Vragen over operationele diensten.',
  'Vragen of overleg met de noodhulpleiding.', 'Solliciteren of vragen over de selectieprocedure.',
  'Een VOG aanvragen of vragen over de beoordeling.', 'Vragen of voorstellen voor politie-evenementen.',
  'Vragen over vervoer en ondersteuning door DV&O.'
 ],
 ambulance: ['Neem contact op met de ambulanceleiding.', 'Solliciteren of vragen over de selectieprocedure.',
  'Vragen over instroom, begeleiding en je loopbaan.', 'Personeelsvragen of een integriteitskwestie bespreken.',
  'Vragen over opleidingen, trainingen en bevoegdheden.', 'Vragen over evenementen en communicatie.'],
 pechhulp: ['Neem contact op met de leiding van Pechhulp.', 'Een vraag over pechhulp of ondersteuning stellen.',
  'Solliciteren of vragen over de werving.', 'Personeelsvragen of een personeelskwestie bespreken.',
  'Vragen over opleidingen en je ontwikkeling.', 'Vragen of voorstellen voor evenementen en organisatie.'],
 brandweer: ['Neem contact op met de brandweerleiding.', 'Solliciteren of vragen over de selectieprocedure.',
  'Personeelsvragen of een personeelskwestie bespreken.', 'Vragen over opleidingen en oefeningen.',
  'Vragen over de operationele dienst.', 'Vragen of voorstellen voor brandweerevenementen.'],
 overheidscoordinator: ['Overleg over de hulpdiensten met de door Gemert aangewezen coördinator.']
};
function readable(text, roles, fallback, limit) {
 const resolved=String(text || '').replace(/<@&(\d+)>/g, (_match,id)=>roles.get(id)?.name || fallback).trim();
 // Never expose unresolved Discord mention syntax or a bare ID as a menu label.
 if (!resolved || /<[@#][^>]*>|^\d{17,20}$/.test(resolved)) return fallback.slice(0,limit);
 return resolved.slice(0,limit);
}
function display(service,department,config,roles) {
 const fallback=presets[service][department];
 return {
  label:readable(config.label,roles,fallback,80),
  description:readable(config.description,roles,descriptions[service][department],100)
 };
}
module.exports={display};
