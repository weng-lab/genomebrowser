table hg38ClinGenClass
"ClinGen Gene-Disease Classification Validity in hg38"
(
string  chrom;		"Reference sequence chromosome or scaffold"
uint    chromStart;	"Start position of feature on chromosome"
uint    chromEnd;	"End position of feature on chromosome"
string  name;		"Name of Disease"
uint    score;		"(Unused)"
char[1] strand;		"(Unused)"
uint    thickStart;	"Coding region start"
uint    thickEnd;	"Coding region end"
uint  	itemRgb;	"Colored according to classification"
string  geneSymbol;	"Gene Symbol"
string  HGNCid;	"GeneNames Page"
string  MONDOid;	"Monarch Disease Ontology Page"
string  Inheritance;	"Inheritance Pattern"
string  SOPversion;	"ClinGen SOP Version"
string	Classification;	"Gene-Disease Validity Classification"
string	ClinGenURL;	"ClinGen Evidence Summary URL"
string	DateCurated;	"Classification Released"
string	Mouseover;	"Mouseover Text"
)

