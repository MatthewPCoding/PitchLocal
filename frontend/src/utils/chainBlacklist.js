const CHAINS = new Set([
  // Fast food — US
  "mcdonald's","burger king","wendy's","taco bell","chick-fil-a",
  "popeyes","kfc","kfc (kentucky fried chicken)","sonic","sonic drive-in",
  "arby's","jack in the box","whataburger","hardee's","carl's jr","carl's jr.",
  "in-n-out","in-n-out burger","five guys","shake shack","wingstop",
  "raising cane's","raising cane's chicken fingers","zaxby's","bojangles",
  "church's chicken",
  // Pizza
  "pizza hut","domino's","domino's pizza","papa john's","papa john's pizza",
  "little caesars","little caesars pizza",
  // Casual dining — US
  "chipotle","chipotle mexican grill","panera","panera bread",
  "olive garden","applebee's","ihop","denny's","red lobster",
  "outback","outback steakhouse","cheesecake factory","the cheesecake factory",
  "buffalo wild wings","hooters","cracker barrel","cracker barrel old country store",
  "longhorn steakhouse","texas roadhouse","chili's","ruby tuesday",
  "red robin","bob evans","waffle house","golden corral",
  // Coffee / bakery
  "starbucks","dunkin","dunkin'","dunkin donuts","dunkin' donuts","tim hortons",
  "costa coffee","mcdonald's mccafé","mccafé",
  // Convenience / dollar
  "7-eleven","7-11","circle k","wawa","sheetz",
  "dollar tree","dollar general","family dollar","five below",
  // Grocery / big box — US
  "walmart","walmart supercenter","target","costco","costco wholesale",
  "sam's club","bj's","bj's wholesale club",
  "kroger","safeway","publix","albertsons","whole foods","whole foods market",
  "trader joe's","aldi","lidl","food lion","stop & shop","giant","h-e-b","meijer",
  // Pharmacy — US
  "walgreens","cvs","cvs pharmacy","rite aid",
  // Fast food / casual — UK & Europe
  "greggs","pret a manger","pret","nando's","wagamama","boots",
  // Grocery — UK & Europe
  "sainsbury's","tesco","tesco express","tesco metro","asda","morrisons","waitrose",
  // Retail — global
  "h&m","zara","ikea","uniqlo","gap","old navy","banana republic",
  "forever 21","urban outfitters","american eagle","hollister",
  "abercrombie & fitch","victoria's secret","bath & body works",
  // Home improvement / electronics / auto
  "home depot","the home depot","lowe's","menards",
  "best buy","autozone","o'reilly","o'reilly auto parts",
  "advance auto","advance auto parts","pep boys","jiffy lube",
  "midas","firestone","firestone complete auto care",
  // Beauty
  "ulta","ulta beauty","sephora",
  // Subs
  "subway",
]);

export function isChain(name) {
  return CHAINS.has((name ?? "").trim().toLowerCase());
}
