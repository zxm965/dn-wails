The tiny TTF and CFF OTF fixtures are synthetic test fonts created with
fontTools FontBuilder. Each contains only `.notdef` and a simple `A` outline;
neither contains game assets nor a redistributed commercial font.

Native runtime tests use them to verify byte-preserving TTF packing, real
OTF conversion, missing Chinese character reporting, ZIP integrity and PAK
resource ownership without requiring the sibling workbench or source PAK.
