import{M as c,cR as g,a5 as m,bZ as x,b_ as u,ck as d,q as y,b$ as h,d4 as v,c6 as p}from"./index-Csbc4Eh5.js";import{g as b}from"./get-slot-Bk_rJcZu.js";const R={gapSmall:"4px 8px",gapMedium:"8px 12px",gapLarge:"12px 16px"};function w(){return R}const z={self:w},C=Object.assign(Object.assign({},u.props),{align:String,justify:{type:String,default:"start"},inline:Boolean,vertical:Boolean,reverse:Boolean,size:{type:[String,Number,Array],default:"medium"},wrap:{type:Boolean,default:!0}}),S=c({name:"Flex",props:C,setup(r){const{mergedClsPrefixRef:t,mergedRtlRef:l}=x(r),a=u("Flex","-flex",void 0,z,r,t);return{rtlEnabled:d("Flex",l,t),mergedClsPrefix:t,margin:y(()=>{const{size:e}=r;if(Array.isArray(e))return{horizontal:e[0],vertical:e[1]};if(typeof e=="number")return{horizontal:e,vertical:e};const{self:{[h("gap",e)]:s}}=a.value,{row:n,col:i}=v(s);return{horizontal:p(i),vertical:p(n)}})}},render(){const{vertical:r,reverse:t,align:l,inline:a,justify:o,margin:e,wrap:s,mergedClsPrefix:n,rtlEnabled:i}=this,f=g(b(this),!1);return f.length?m("div",{role:"none",class:[`${n}-flex`,i&&`${n}-flex--rtl`],style:{display:a?"inline-flex":"flex",flexDirection:r&&!t?"column":r&&t?"column-reverse":!r&&t?"row-reverse":"row",justifyContent:o,flexWrap:!s||r?"nowrap":"wrap",alignItems:l,gap:`${e.vertical}px ${e.horizontal}px`}},f):null}});export{S as _};
