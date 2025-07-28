# MethylC track design specifications

## Details

MethylC track displays a bar plot like track with a line over the bars. The bars represent signal value (0 to 1) and the line represents read depth. In some spaces, there may not be any data and the bar will not be displayed, however, to signify that there is no data as opposed to a low signal value, a different color background will be used to showcase the lack of data. 

There will be 2 "sub tracks" per methylC track. One for each strand (forward and backward). 

There can be up to 8 bedGraph files that result from experiments, however the track will only require one bedGraph file (explained in the format section below).

example track will look like:
```json
{
  "type": "methylc",
  "name": "H1",
  "url": "https://vizhub.wustl.edu/public/hg19/methylc2/h1.liftedtohg19.gz",
  "options": {
    "label": "Methylation",
    "colorsForContext": {
      "CG": { "color": "#648bd8", "background": "#d9d9d9" },
      "CHG": { "color": "#ff944d", "background": "#ffe0cc" },
      "CHH": { "color": "#ff00ff", "background": "#ffe5ff" }
    },
    "depthColor": "#01E9FE"
  },
}
```

## methylC BedGraph Format

| chromosome | start |  end  | methylation context | methylation value | strand | read depth |
|------------|-------|-------|---------------------|-------------------|--------|------------|
| chr1       | 10542 | 10543 | CG                  | 0.923             | -      | 26         |
| chr1       | 10556 | 10557 | CHH                 | 0.040             | -      | 25         |
| chr1       | 10562 | 10563 | CG                  | 0.941             | +      | 17         |
| chr1       | 10563 | 10564 | CG                  | 0.958             | -      | 24         |
| chr1       | 10564 | 10565 | CHG                 | 0.056             | +      | 18         |
| chr1       | 10566 | 10567 | CHG                 | 0.045             | -      | 22         |
| chr1       | 10570 | 10571 | CG                  | 0.870             | +      | 23         |
| chr1       | 10571 | 10572 | CG                  | 0.913             | -      | 23         |

In the WashU browser, the bedGraph file is compressed by bgzip and indexed by Tabix.