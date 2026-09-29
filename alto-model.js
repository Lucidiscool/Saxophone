import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {DRACOLoader} from './vendor/DRACOLoader.js';
export async function createAlto(onProgress){
 const draco=new DRACOLoader();draco.setDecoderPath('./vendor/draco/');const loader=new GLTFLoader();loader.setDRACOLoader(draco);
 const compact=innerWidth<700||(navigator.deviceMemory&&navigator.deviceMemory<=4);
 const gltf=await loader.loadAsync(compact?'./assets/models/charlie-parker-alto-mobile.glb':'./assets/models/charlie-parker-alto.glb',onProgress);draco.dispose();
 const root=new THREE.Group(),oriented=new THREE.Group();oriented.add(gltf.scene);gltf.scene.quaternion.set(-.5,.5,-.5,.5);oriented.rotation.y=Math.PI;root.add(oriented);root.updateMatrixWorld(true);
 let box=new THREE.Box3().setFromObject(oriented),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());oriented.position.sub(center);root.scale.setScalar(4.25/size.y);root.updateMatrixWorld(true);
 // Bake normalization into an outer group so key anchors use stable scene units.
 const normalized=new THREE.Group();normalized.add(root);normalized.userData.keys=[];
 gltf.scene.traverse(o=>{if(o.isMesh){o.material.roughness=.7;o.material.metalness=.15;o.material.envMapIntensity=.7;o.material.normalScale.set(.7,.7);}});
 addTouches(normalized,[{"note":11,"position":[0.15938203545271187,0.45439552371446823,0.08304498790897119],"radius":0.055},{"note":9,"position":[0.13878728941549542,0.2807576986679998,0.0912724400972088],"radius":0.055},{"note":7,"position":[0.16176138219173883,0.17888669975538965,0.052353618061352636],"radius":0.055},{"note":5,"position":[-0.0795559262961404,-0.8840814013104014,0.21129371856031076],"radius":0.055},{"note":4,"position":[-0.09946344546950865,-1.0906655228685922,0.20681344272423574],"radius":0.055},{"note":2,"position":[-0.1472598885154297,-1.2788694140102956,0.26447224101752553],"radius":0.055},{"note":0,"position":[-0.32765305571845216,-1.4069231461066678,0.3177436083486518],"radius":0.055},{"note":12,"position":[0.14867150681327462,0.9574855808382332,0.13087647701585214],"radius":0.055}]);return normalized;
}
export function addTouches(model,anchors){
 for(const anchor of anchors){const key=new THREE.Group();key.position.fromArray(anchor.position);key.userData.note=anchor.note;key.userData.restZ=key.position.z;
 const mat=new THREE.MeshBasicMaterial({color:0xe5bd79,transparent:true,opacity:0,depthWrite:false});const dome=new THREE.Mesh(new THREE.SphereGeometry(anchor.radius||.055,20,12),mat);key.add(dome);key.userData.dome=dome;key.userData.pearl=mat;model.add(key);model.userData.keys.push(key);}
}
export function disposeModel(root){const geos=new Set(),mats=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){mats.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});for(const g of geos)g.dispose();for(const m of mats)m.dispose();for(const t of textures)t.dispose();}
