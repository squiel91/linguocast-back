import * as OpenCC from 'opencc-js'

let ACCENTED = {
  '1': {'a': '\u0101', 'e': '\u0113', 'i': '\u012B', 'o': '\u014D', 'u': '\u016B', 'ü': '\u01D6'},
  '2': {'a': '\u00E1', 'e': '\u00E9', 'i': '\u00ED', 'o': '\u00F3', 'u': '\u00FA', 'ü': '\u01D8'},
  '3': {'a': '\u01CE', 'e': '\u011B', 'i': '\u01D0', 'o': '\u01D2', 'u': '\u01D4', 'ü': '\u01DA'},
  '4': {'a': '\u00E0', 'e': '\u00E8', 'i': '\u00EC', 'o': '\u00F2', 'u': '\u00F9', 'ü': '\u01DC'},
  '5': {'a': 'a', 'e': 'e', 'i': 'i', 'o': 'o', 'u': 'u', 'ü': 'ü'}
};

function getPos (token: string) {
  // only one letter, nothing to differentiate
  if (token.length === 1) return 0
  const precedence = ['a', 'e', 'o']
  for (let i=0; i<precedence.length; i += 1){
      let pos = token.indexOf(precedence[i]);
      // checking a before o, will take care of ao automatically
      if (pos >= 0){
          return pos;
      }
  }
  let u = token.indexOf('u');
  let i = token.indexOf('i');
  if (i < u){
      // -iu OR u-only case, accent goes to u
      return u;
  } else {
      // -ui OR i-only case, accent goes to i
      return i;
  }
  // the only vowel left is ü
  let ü = token.indexOf('ü');
  if (ü >= 0){
      return ü;
  }
}

const convertPinyin = (numbered_PinYin: string) => {
  let ToneIndex = numbered_PinYin.charAt(numbered_PinYin.length - 1)
  let accentpos = getPos(numbered_PinYin);
  let accented_Char = ACCENTED[ToneIndex][numbered_PinYin.charAt(accentpos)];
  let accented_PinYin = "";
  if (accentpos === 0){
    // minus one to trimm the number off
    accented_PinYin = accented_Char + numbered_PinYin.substr(1, numbered_PinYin.length-1); 
  } else {
    let before = numbered_PinYin.substr(0, accentpos);
    let after = numbered_PinYin.substring(accentpos+1, numbered_PinYin.length-1);
    accented_PinYin = before + accented_Char + after;
  }
  return accented_PinYin;
}

export const convertNumericToTonalPinyin = (text: string) => {
  return text
    .split(' ')
    .map(part => convertPinyin(part))
    .join(' ')
}

export const converToTraditional = (text: string): string => {
  const converter = OpenCC.Converter({ from: 'cn', to: 'hk' })
  return converter(text)
}

export const converToSimplfied = (text: string): string => {
  const converter = OpenCC.Converter({ from: 'hk', to: 'cn' })
  return converter(text)
}
