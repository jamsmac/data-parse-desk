import{c as f,e as k,r as u,j as l,m,y as $}from"./index-DE73ohTM.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H=f("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=f("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);var d="Progress",c=100,[I,S]=k(d),[V,j]=I(d),x=u.forwardRef((e,r)=>{const{__scopeProgress:n,value:t=null,max:a,getValueLabel:N=w,...b}=e;(a||a===0)&&!p(a)&&console.error(E(`${a}`,"Progress"));const s=p(a)?a:c;t!==null&&!v(t,s)&&console.error(R(`${t}`,"Progress"));const o=v(t,s)?t:null,M=i(o)?N(o,s):void 0;return l.jsx(V,{scope:n,value:o,max:s,children:l.jsx(m.div,{"aria-valuemax":s,"aria-valuemin":0,"aria-valuenow":i(o)?o:void 0,"aria-valuetext":M,role:"progressbar","data-state":y(o,s),"data-value":o??void 0,"data-max":s,...b,ref:r})})});x.displayName=d;var g="ProgressIndicator",h=u.forwardRef((e,r)=>{const{__scopeProgress:n,...t}=e,a=j(g,n);return l.jsx(m.div,{"data-state":y(a.value,a.max),"data-value":a.value??void 0,"data-max":a.max,...t,ref:r})});h.displayName=g;function w(e,r){return`${Math.round(e/r*100)}%`}function y(e,r){return e==null?"indeterminate":e===r?"complete":"loading"}function i(e){return typeof e=="number"}function p(e){return i(e)&&!isNaN(e)&&e>0}function v(e,r){return i(e)&&!isNaN(e)&&e<=r&&e>=0}function E(e,r){return`Invalid prop \`max\` of value \`${e}\` supplied to \`${r}\`. Only numbers greater than 0 are valid max values. Defaulting to \`${c}\`.`}function R(e,r){return`Invalid prop \`value\` of value \`${e}\` supplied to \`${r}\`. The \`value\` prop must be:
  - a positive number
  - less than the value passed to \`max\` (or ${c} if no \`max\` prop is set)
  - \`null\` or \`undefined\` if the progress is indeterminate.

Defaulting to \`null\`.`}var P=x,T=h;const _=u.forwardRef(({className:e,value:r,...n},t)=>l.jsx(P,{ref:t,className:$("relative h-4 w-full overflow-hidden rounded-full bg-secondary",e),...n,children:l.jsx(T,{className:"h-full w-full flex-1 bg-primary transition-all",style:{transform:`translateX(-${100-(r||0)}%)`}})}));_.displayName=P.displayName;export{H as F,_ as P,L as T};
