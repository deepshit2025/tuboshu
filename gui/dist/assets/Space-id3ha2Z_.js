import{M as R,cR as G,a5 as w,C as j,bZ as E,b_ as C,ck as M,q as _,b$ as I,d4 as L,c6 as S}from"./index-CQwGNwkV.js";import{i as P}from"./headers-NJL_reWw.js";import{g as T}from"./get-slot-Bk_rJcZu.js";const A={gapSmall:"4px 8px",gapMedium:"8px 12px",gapLarge:"12px 16px"};function O(){return A}const W={self:O};let x;function D(){if(!P)return!0;if(x===void 0){const e=document.createElement("div");e.style.display="flex",e.style.flexDirection="column",e.style.rowGap="1px",e.appendChild(document.createElement("div")),e.appendChild(document.createElement("div")),document.body.appendChild(e);const n=e.scrollHeight===1;return document.body.removeChild(e),x=n}return x}const F=Object.assign(Object.assign({},C.props),{align:String,justify:{type:String,default:"start"},inline:Boolean,vertical:Boolean,reverse:Boolean,size:{type:[String,Number,Array],default:"medium"},wrapItem:{type:Boolean,default:!0},itemClass:String,itemStyle:[String,Object],wrap:{type:Boolean,default:!0},internalUseGap:{type:Boolean,default:void 0}}),k=R({name:"Space",props:F,setup(e){const{mergedClsPrefixRef:n,mergedRtlRef:u}=E(e),d=C("Space","-space",void 0,W,e,n),t=M("Space",u,n);return{useGap:D(),rtlEnabled:t,mergedClsPrefix:n,margin:_(()=>{const{size:r}=e;if(Array.isArray(r))return{horizontal:r[0],vertical:r[1]};if(typeof r=="number")return{horizontal:r,vertical:r};const{self:{[I("gap",r)]:f}}=d.value,{row:a,col:g}=L(f);return{horizontal:S(g),vertical:S(a)}})}},render(){const{vertical:e,reverse:n,align:u,inline:d,justify:t,itemClass:r,itemStyle:f,margin:a,wrap:g,mergedClsPrefix:h,rtlEnabled:v,useGap:o,wrapItem:$,internalUseGap:B}=this,p=G(T(this),!1);if(!p.length)return null;const b=`${a.horizontal}px`,c=`${a.horizontal/2}px`,z=`${a.vertical}px`,s=`${a.vertical/2}px`,l=p.length-1,m=t.startsWith("space-");return w("div",{role:"none",class:[`${h}-space`,v&&`${h}-space--rtl`],style:{display:d?"inline-flex":"flex",flexDirection:e&&!n?"column":e&&n?"column-reverse":!e&&n?"row-reverse":"row",justifyContent:["start","end"].includes(t)?`flex-${t}`:t,flexWrap:!g||e?"nowrap":"wrap",marginTop:o||e?"":`-${s}`,marginBottom:o||e?"":`-${s}`,alignItems:u,gap:o?`${a.vertical}px ${a.horizontal}px`:""}},!$&&(o||B)?p:p.map((y,i)=>y.type===j?y:w("div",{role:"none",class:r,style:[f,{maxWidth:"100%"},o?"":e?{marginBottom:i!==l?z:""}:v?{marginLeft:m?t==="space-between"&&i===l?"":c:i!==l?b:"",marginRight:m?t==="space-between"&&i===0?"":c:"",paddingTop:s,paddingBottom:s}:{marginRight:m?t==="space-between"&&i===l?"":c:i!==l?b:"",marginLeft:m?t==="space-between"&&i===0?"":c:"",paddingTop:s,paddingBottom:s}]},y)))}});export{k as _};
