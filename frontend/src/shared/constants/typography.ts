export const fontFamily = {
  regular: 'Galmuri11',
  bold: 'Galmuri11-Bold',
  condensed: 'Galmuri11-Condensed',
} as const;

export const textStyles = {
  heading1: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 36 },
  heading2: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 28 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  bodyBold: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
} as const;
