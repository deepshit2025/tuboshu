import{bO as B,bR as z,bU as f,cf as b,M as S,a5 as T,bZ as y,b_ as W,q as m,b$ as h,c0 as P}from"./index-X6xQIiil.js";const D=typeof document<"u"&&typeof window<"u";function k(r){return r.replace(/#|\(|\)|,|\s|\./g,"_")}const v={headerFontSize1:"30px",headerFontSize2:"22px",headerFontSize3:"18px",headerFontSize4:"16px",headerFontSize5:"16px",headerFontSize6:"16px",headerMargin1:"28px 0 20px 0",headerMargin2:"28px 0 20px 0",headerMargin3:"28px 0 20px 0",headerMargin4:"28px 0 18px 0",headerMargin5:"28px 0 18px 0",headerMargin6:"28px 0 18px 0",headerPrefixWidth1:"16px",headerPrefixWidth2:"16px",headerPrefixWidth3:"12px",headerPrefixWidth4:"12px",headerPrefixWidth5:"12px",headerPrefixWidth6:"12px",headerBarWidth1:"4px",headerBarWidth2:"4px",headerBarWidth3:"3px",headerBarWidth4:"3px",headerBarWidth5:"3px",headerBarWidth6:"3px",pMargin:"16px 0 16px 0",liMargin:".25em 0 0 0",olPadding:"0 0 0 2em",ulPadding:"0 0 0 2em"};function w(r){const{primaryColor:e,textColor2:o,borderColor:n,lineHeight:t,fontSize:i,borderRadiusSmall:a,dividerColor:g,fontWeightStrong:C,textColor1:d,textColor3:s,infoColor:l,warningColor:x,errorColor:p,successColor:c,codeColor:u}=r;return Object.assign(Object.assign({},v),{aTextColor:e,blockquoteTextColor:o,blockquotePrefixColor:n,blockquoteLineHeight:t,blockquoteFontSize:i,codeBorderRadius:a,liTextColor:o,liLineHeight:t,liFontSize:i,hrColor:g,headerFontWeight:C,headerTextColor:d,pTextColor:o,pTextColor1Depth:d,pTextColor2Depth:o,pTextColor3Depth:s,pLineHeight:t,pFontSize:i,headerBarColor:e,headerBarColorPrimary:e,headerBarColorInfo:l,headerBarColorError:p,headerBarColorWarning:x,headerBarColorSuccess:c,textColor:o,textColor1Depth:d,textColor2Depth:o,textColor3Depth:s,textColorPrimary:e,textColorInfo:l,textColorSuccess:c,textColorWarning:x,textColorError:p,codeTextColor:o,codeColor:u,codeBorder:"1px solid #0000"})}const F={common:B,self:w},M=z("h",`
 font-size: var(--n-font-size);
 font-weight: var(--n-font-weight);
 margin: var(--n-margin);
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
`,[f("&:first-child",{marginTop:0}),b("prefix-bar",{position:"relative",paddingLeft:"var(--n-prefix-width)"},[b("align-text",{paddingLeft:0},[f("&::before",{left:"calc(-1 * var(--n-prefix-width))"})]),f("&::before",`
 content: "";
 width: var(--n-bar-width);
 border-radius: calc(var(--n-bar-width) / 2);
 transition: background-color .3s var(--n-bezier);
 left: 0;
 top: 0;
 bottom: 0;
 position: absolute;
 `),f("&::before",{backgroundColor:"var(--n-bar-color)"})])]),$=Object.assign(Object.assign({},W.props),{type:{type:String,default:"default"},prefix:String,alignText:Boolean}),R=r=>S({name:`H${r}`,props:$,setup(e){const{mergedClsPrefixRef:o,inlineThemeDisabled:n}=y(e),t=W("Typography","-h",M,F,e,o),i=m(()=>{const{type:g}=e,{common:{cubicBezierEaseInOut:C},self:{headerFontWeight:d,headerTextColor:s,[h("headerPrefixWidth",r)]:l,[h("headerFontSize",r)]:x,[h("headerMargin",r)]:p,[h("headerBarWidth",r)]:c,[h("headerBarColor",g)]:u}}=t.value;return{"--n-bezier":C,"--n-font-size":x,"--n-margin":p,"--n-bar-color":u,"--n-bar-width":c,"--n-font-weight":d,"--n-text-color":s,"--n-prefix-width":l}}),a=n?P(`h${r}`,m(()=>e.type[0]),i,e):void 0;return{mergedClsPrefix:o,cssVars:n?void 0:i,themeClass:a==null?void 0:a.themeClass,onRender:a==null?void 0:a.onRender}},render(){var e;const{prefix:o,alignText:n,mergedClsPrefix:t,cssVars:i,$slots:a}=this;return(e=this.onRender)===null||e===void 0||e.call(this),T(`h${r}`,{class:[`${t}-h`,`${t}-h${r}`,this.themeClass,{[`${t}-h--prefix-bar`]:o,[`${t}-h--align-text`]:n}],style:i},a)}}),L=R("3");export{L as N,k as c,D as i,F as t};
