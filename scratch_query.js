const profiles = [
  { id: 'c99688ad-31f2-4724-b170-e43888ac9de8', nome: 'Marinna Morena', ativo: true },
  { id: 'd11433e1-06c5-4002-be7e-0e2c44bc5782', nome: 'Thiago Costa', ativo: true },
  { id: '60e40726-119b-49e6-8663-43a64bbed180', nome: 'Fernanda Ganem', ativo: true },
  { id: '5d77ad8f-8ad8-4cf5-b4b5-854a906e7b65', nome: 'Guto', ativo: true },
  { id: 'e16c6550-32c7-4cbb-b6a9-cff8dc02d9ed', nome: 'César André', ativo: true }
];

function processMentions(texto, currentUserId) {
  const otherProfiles = profiles.filter(p => p.id !== currentUserId && p.ativo);
  const matchedRanges = [];

  const normalizeStr = (str) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const textNormalized = normalizeStr(texto);

  for (const p of otherProfiles) {
    const firstName = p.nome.split(' ')[0];
    const tagsToCheck = [
      `@${p.nome}`,
      `@${firstName}`
    ];
    const uniqueNormalizedTags = Array.from(new Set(tagsToCheck.map(t => normalizeStr(t))));

    for (const tag of uniqueNormalizedTags) {
      let index = textNormalized.indexOf(tag);
      while (index !== -1) {
        const charAfter = texto[index + tag.length];
        if (!charAfter || /[\s.,!?;:]/.test(charAfter)) {
          matchedRanges.push({
            start: index,
            end: index + tag.length,
            profile: p
          });
        }
        index = textNormalized.indexOf(tag, index + 1);
      }
    }
  }

  const finalMentions = matchedRanges.filter(r1 => {
    const isSubRange = matchedRanges.some(r2 => 
      r2 !== r1 && 
      r2.start <= r1.start && 
      r2.end >= r1.end && 
      (r2.end - r2.start) > (r1.end - r1.start)
    );
    return !isSubRange;
  });

  const uniqueMentionIds = Array.from(new Set(finalMentions.map(r => r.profile.id)));
  return uniqueMentionIds.map(id => otherProfiles.find(p => p.id === id));
}

console.log("Test 1 (Full Name with Accents):", processMentions("Olá @César André, veja isso", "d11433e1-06c5-4002-be7e-0e2c44bc5782"));
console.log("Test 2 (First Name with Accents):", processMentions("Olá @Cesar", "d11433e1-06c5-4002-be7e-0e2c44bc5782"));
console.log("Test 3 (Mixed Case and Accents):", processMentions("Olá @cesar andre e @fernanda", "d11433e1-06c5-4002-be7e-0e2c44bc5782"));
console.log("Test 4 (No overlaps):", processMentions("Olá @Fernanda Ganem", "d11433e1-06c5-4002-be7e-0e2c44bc5782"));
