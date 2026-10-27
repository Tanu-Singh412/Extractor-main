const { parsePassportText } = require('../../src/parsers');

const rawOcr = `
[INU
&@ ative .
@ mt
" |
HE i
He |
HE )
SE
TT Tw, 1 a |
_— PE S—
SR T— 3 ” |
-. a oe EE 1 Iti |
rE Se oft 153 Gin LLU EL 3
DINESH KUMAR AGARWAL aie I
oy Hara thr as
ASHA AGARWAL tis i
fa ame Spots Le f
SUNITA AGARWAL : [| |
his i |
208,BIBHAV RESIDENCY APPARTMENT wn
BIBHAV NAGAR,AGRA Cr |
PIN:282001,UTTAR (PRADESH, INDIA el \
So ER 1 5 8 8 J td Psprt wi Dic ao coats sid |
N7713899 15/04/2015 GHAZIABAD vot I.
a . nm
622070303899426 iy
|
i
" - n 1] "a [0
- La “lin = .
- Es [
\\
.
. - .
5
A : v 4 - 5
|=
[3
re 5 ¢ |
I
iE
J R
I
§
. R
oo

|
aren
BE HL... HE
|
: |
|B
fe Bi
se MUN
- _ o
i Cs " - Eee me C— ey [|
a ne TERRES Rs =~ r= ra 5 i |
a WEI 0529378 1 '
\\ AGARWAL 5
Sy [— = f
ease i ANUBHAY & re
ig UR {Da ol pith fm sex = Ee |
14/03/1980 Ll Se |
3 poo = I
5 Po AGRA,UTTAR PRADESH = 1
a - : * al i Place of ie =
y GHAZIABAD Ek i i
Bs TT 1 Date ot vse EI 2 Rif sce of Exes M 1
i 2 12/11/2024 11/11/2034 i
|
| |
P<INDAGARWAL<CANUBHAV<<<<<LLLLLLLLLLLLLLLLLL Th. |
C5293781<9INDBO03144M34111 152070303899424<94 oy | 5) |
Bu no ; |
ee ___ —_— N T i kL
- - » = |
: a [
0
SRL
" | 1 -
ar :
pn 9 [= El yr
M1 of = a |
a gC] R— 4
_]] I ; a
SEE | 5 -
°
i ]
L
ml
i = |
`;

(async () => {
  const result = await parsePassportText(rawOcr);
  console.log('Parse result:', JSON.stringify(result, null, 2));
})();
