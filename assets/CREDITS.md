# Asset credits

- Five weapon models: Quaternius, Ultimate Guns Pack (2019). Source: https://quaternius.com/packs/ultimategun.html. Files selected: Pistol_5, SubmachineGun_1, AssaultRifle_1, AssaultRifle2_1, SniperRifle_1. Embedded source License.txt states CC0 1.0 Universal. Modified: scale/axes, edge bevels, vertex contact occlusion, PBR materials, GLB conversion.
- SWAT character, skeleton and animation clips: Quaternius, Ultimate Modular Men Pack (2022). Source: https://quaternius.com/packs/ultimatemodularcharacters.html. Original Swat.gltf. Embedded source License.txt states CC0 1.0 Universal. Modified: team materials, selected animations, binary GLB container, weapon attachment and left-arm support pose.
- First-person hands: derived from the above SWAT model. Static hand/forearm extraction and grip pose authored with the project's Blender preparation script. Same CC0 license.
- District architecture, pavement, vegetation, map layout, interface and game logic: original project work. No Riot Games or Valve assets are included.
- Three.js 0.169.0 and its GLTFLoader, SkeletonUtils and BufferGeometryUtils: MIT. PeerJS 1.5.4: MIT.

Copies of source asset licenses are in licenses/.

## V04 — textured first-person equipment

The following model **data**, adapted and posed by cktang88 in [3d-fps](https://github.com/cktang88/3d-fps), are used under the original asset licenses. No application code, Fab animation set, mocap clips, Riot Games or Valve assets are included. Further BREACH changes: clips removed except the two CC0 locomotion clips noted below; real-scale camera framing; material tuning; original procedural recoil, magazine animation and arm IK; operator motion retargeting and team patch.

Assets under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/):

- **Fps arms**, DJMaesen / bumstrum: https://sketchfab.com/3d-models/fps-arms-9452ce4cddde4110a4fd73e555a8e412 — gloved hands, sleeves and textures.
- **FPS AK-74m animations**, Cransh: https://sketchfab.com/3d-models/fps-ak-74m-animations-94be8385c402474cacd39bc096c6ca14 — arm rig and static grip template.
- **FPS pistol animations**, Cransh: https://sketchfab.com/3d-models/fps-pistol-animations-0d7a343dcb6f401197a73c91aee93f6d — arm rig and static grip template.
- **FPS animations sniper rifle**, Cransh: https://sketchfab.com/3d-models/fps-animations-sniper-rifle-c15ae8393d824f5b929e3f69691cdd31 — arm rig and static grip template.
- **M4A1**, Firewarden3D: https://sketchfab.com/3d-models/m4a1-40d8ef818c7549a896371cbb1f64fec6
- **MP5 Submachine Gun**, Rotuma: https://sketchfab.com/3d-models/mp5-submachine-gun-a73b61932a0e4eecb5db5c63c158aa24
- **SIG Sauer P226**, Alexcanot: https://sketchfab.com/3d-models/sig-sauer-p226-e3d4f1ab22f342f4a0891743353c114c
- **M24 Bounty Hunter Sniper Rifle**, Naudaff3D: https://sketchfab.com/3d-models/m24-bounty-hunter-sniper-rifle-d40e74e2259549f5b025807163f1028c
- **Military tactical suit (LowPolyGameReady)**, DanlyVostok / 1799danly: https://sketchfab.com/3d-models/military-tactical-suit-lowpolygameready-ef698ce36b1545a78ce592dd3db4c7ed
- **FREE Military Soldier RIGGED**, BAMEN: https://sketchfab.com/3d-models/free-military-soldier-rigged-e9c56308a67d4a3db62e914fafa4d198 — animation source skeleton; the fallback body is not displayed.

The source Sketchfab API license records are preserved in `art/source/v4/*-source.json`. They identify the license as CC Attribution 4.0, with author credit required and commercial use allowed. Attribution remains required in any redistributed build.

**AK-47:** adapted from Operation Steel Tide model data, credited by the upstream project to CC0 meshes by nisu, taradavies and Quaternius (Ultimate Guns). The arm rig and texture attribution above also applies to this combined GLB.

**Operator locomotion:** Quaternius, [Universal Animation Library](https://quaternius.com/), CC0, `aim_idle` and `aim_run` only, retargeted onto the above soldier rig. The source file's `mocap_*` clips and all other clips are excluded from the distributed file.

## V04 — map materials

[Poly Haven](https://polyhaven.com/license), CC0:

- [Plastered Wall 02](https://polyhaven.com/a/plastered_wall_02), Charlotte Baglioni.
- [Stone Tiles 03](https://polyhaven.com/a/stone_tiles_03), eye-candy.xyz.
- [Sandstone Blocks 05](https://polyhaven.com/a/sandstone_blocks_05), Rob Tuytel.

One-kilopixel diffuse, OpenGL normal and roughness maps, with original color/contrast tuning in the renderer. Courtyard layout, buildings, arch geometry, cover, roof work, signage, contact shading and all game logic are original project work. Three.js Meshopt decoder retains its upstream MIT notice.


## V05 — texture and M24 refinement

The same three Poly Haven CC0 materials above are now shipped at 2K for diffuse, OpenGL normal and roughness. Download URLs and SHA-256 hashes are in `art/source/v5-textures.json`. Gable UVs now preserve physical texel scale. Original M24 model data remains unchanged; its runtime stock/metal/lens materials, forearm placement, recoil recovery and optic UI are modified by BREACH.


## V06 — movement and AI

Operator locomotion now also includes Quaternius `aim_walk` (CC0), alongside `aim_idle` and `aim_run`, retargeted to the credited soldier rig. No other clips are distributed. All bot perception, search, navigation, cover selection, reaction/accuracy profiles and team coordination code is original BREACH work.


## V13 — courtyard materials and presentation

Additional [Poly Haven CC0](https://polyhaven.com/license) materials:

- [Stone Tiles 02](https://polyhaven.com/a/stone_tiles_02), Charlotte Baglioni: 2K diffuse, OpenGL normal and roughness; physically scaled courtyard paving.
- [Weathered Planks](https://polyhaven.com/a/weathered_planks), Dario Barresi and Dimitrios Savva: 1K diffuse, OpenGL normal and roughness; doors, shutters and cover.

Original download URLs, SHA-256 hashes and sizes are preserved in `art/source/v13-textures.json`. The procedural sky, wall aging, architectural hardware, world-space foot planting and first-person movement response are original project work. Existing CC BY credits above continue to apply to the models.

## V14 — CALDERA / Coastal Research Station 07

All station architecture, observatory dome, parabolic antennas, telemetry aperture, heliostat collector and arches, research equipment pods, baffles, coastal cliff geometry and site signage are original project geometry. The ground plan, playable lanes and authoritative collision volumes are preserved from Porta / 07. No Valve or Riot architecture, map, texture or branding assets are used.

Additional [Poly Haven CC0](https://polyhaven.com/license) materials:

- [Rock Face 03](https://polyhaven.com/a/rock_face_03), Dario Barresi and Rico Cilliers: 1K diffuse, OpenGL normal and roughness, applied to the original coastal backdrop geometry.
- [Blue Metal Plate](https://polyhaven.com/a/blue_metal_plate), Rob Tuytel: 1K diffuse, OpenGL normal and roughness, used on coated metal and for subtle surface variation on the architectural metalwork.

Download URLs, sizes and SHA-256 hashes are in `art/source/v14-textures.json`. Static courtyard environment capture, material treatment and light setup are original runtime work. Model attributions above remain required.

## V15 — NEXUS, K-07 and movement presentation

NEXUS / 09 station geometry, pressure vault, cargo machinery, floor kit, signage, stars and procedural ice-giant shader are original project work. Its coated-metal surface detail reuses the already credited Poly Haven Blue Metal Plate CC0 maps; no additional external media are included.

The K-07 blade, handle, guard and fasteners are original geometry. First-person gloves and arm rigs remain adapted from the credited P226 / FPS arms assets above, under their existing CC BY 4.0 attribution requirements. The knife is attached to that authored grip; no Valve or Riot weapon, animation or sound asset is used. Weapon switching, melee rules, jump tuning, air steering and local render interpolation are original runtime work.

## V16 — arena readability

Ceramic-coat grain, revised architectural palettes, lighting/fill, material albedo treatment, cargo access panels and floor seams are original project work. Existing credited CC0 surface maps and CC BY character/weapon assets remain in use under the attributions above. No additional external asset was introduced.

## V17 — authored environment kit

Five hard-surface GLBs, their Blender source script and the three-row wayfinding artwork are original ORECCHIONI BATTLE project work. Created/exported with installed Blender 5.2.1 LTS and VectorCraft 0.12 MCP. No third-party generated model or paid generator was used. The finish uses the previously credited Poly Haven Blue Metal Plate CC0 normal map. Existing character, hand and weapon credits remain required. See `assets/models/v17/manifest.json` for model identities and export statistics.

## V19 — FORGE and weapon finishes

FORGE /11 turbine-hall geometry, overhead service bridges, flow-control cover, wayfinding and alpine terrain are original ORECCHIONI BATTLE work. They reuse the already credited Poly Haven CC0 plaster and slate maps and two original V17 cargo meshes. Matte coat/hardware recoloring and bicolor/topographic surface shaders are original runtime work. Existing source model/texture attributions and CC BY4.0 requirements continue to apply to customized weapon, hand and character models. No new third-party model, paid asset, Valve asset or Riot asset is included.

## V23 — SAHRA and objective equipment

SAHRA / 13 layout, architecture, arches, signs, bomb and flashbang geometry are original project work. Stone, plaster, paving and wood reuse the already credited Poly Haven CC0 materials. First-person inspection and shoulder/grip adjustments use the existing credited weapon and arm rigs under their original attribution requirements. No Valve or Riot map, model, animation or sound asset is included.

## V24 — SAHRA / D2 route reconstruction

The former quarter is replaced by a larger reconstruction of the route topology studied in online Dust II radar and Valve environment references. Walkable-space geometry, terrain ramps/pit, vehicles, tunnel pillars, arches, kasbah silhouette, facade kit and route-overview artwork are original project work. Existing credited CC0 material maps and CC BY weapon/operator rigs remain in use. No reference image or Valve game asset is distributed. Source references and the extent of adaptation are documented in `QA-DUST-LAYOUT-V24.md` in the source repository.

## V25 — desert architectural detail

Arched closed-window frames, shutter variations, house/hotel facade kit, stone vaults, door vestibule, B Window approach, vehicle/crate details, painted navigation marks, awning supports, palm geometry and overhead wiring are original project work. They use the previously credited CC0 material maps; no new external model or reference bitmap is distributed. Gameplay/collision and reference notes are in `QA-DUST-DETAIL-V25.md` in the source repository.

## V26 — desert construction and level detail

Inclined double-door leaves and hardware, elliptical tunnel masonry, physical Short/Lower treads, localized skylights, raised tunnel terrain, original crate finishes and the tactical overview are original project work. Materials reuse the previously credited Poly Haven CC0 maps, including Stone Tiles 02. Existing weapon/operator/hand model attribution remains unchanged. No Valve/Riot geometry, texture, animation, sound or reference screenshot is distributed. Reference/adaptation notes and checks are in `QA-DUST-RECONSTRUCTION-V26.md` in the source repository.

## V27 — court infill and combat cover

Market/workshop annexes, shutter/vent detail and the new masonry/cargo placements are original ORECCHIONI BATTLE project work. They reuse the existing credited CC0 texture maps and original procedural geometry; no new third-party media is distributed. Layout and verification notes are in `QA-SAHRA-SPACES-V27.md` in the source repository.

V27 contemporary Sahra: original Aurore/Riwaq pavilion geometry, clerestory/frontage kit, petrol/ivory/copper palette and flush site inlays. Reuses the existing credited CC0 texture maps at metric scale. No Valve/Riot geometry, textures or other new external media.

## V28.1 — material library

Additional [Poly Haven](https://polyhaven.com/license) CC0 materials (2K sources, shipped as WebP: diffuse up to 2K, normal and roughness 1K). Download URLs, SHA-256 hashes and sizes are in `art/source/v28-textures.json`.

- [Asphalt 02](https://polyhaven.com/a/asphalt_02), Rob Tuytel
- [Ceramic Roof 01](https://polyhaven.com/a/ceramic_roof_01), Rob Tuytel
- [Cobblestone Floor 04](https://polyhaven.com/a/cobblestone_floor_04), Rob Tuytel
- [Concrete Floor Worn 001](https://polyhaven.com/a/concrete_floor_worn_001), Dimitrios Savva, Rico Cilliers
- [Concrete Wall 008](https://polyhaven.com/a/concrete_wall_008), Dario Barresi, Charlotte Baglioni
- [Corrugated Iron](https://polyhaven.com/a/corrugated_iron), Jenelle van Heerden, Dimitrios Savva
- [Gravelly Sand](https://polyhaven.com/a/gravelly_sand), Dario Barresi
- [Metal Plate](https://polyhaven.com/a/metal_plate), Rob Tuytel
- [Painted Plaster Wall](https://polyhaven.com/a/painted_plaster_wall), Amal Kumar
- [Plastered Stone Wall](https://polyhaven.com/a/plastered_stone_wall), Rob Tuytel
- [Rough Plasterbrick 05](https://polyhaven.com/a/rough_plasterbrick_05), Rob Tuytel
- [Rusty Metal 02](https://polyhaven.com/a/rusty_metal_02), Rob Tuytel
- [Sandstone Cracks](https://polyhaven.com/a/sandstone_cracks), Rob Tuytel
- [White Rough Plaster](https://polyhaven.com/a/white_rough_plaster), Rob Tuytel
- [Wood Peeling Paint Weathered](https://polyhaven.com/a/wood_peeling_paint_weathered), Rob Tuytel, Dimitrios Savva

The earlier Poly Haven sets are now also shipped as WebP; their original JPG files are kept under `art/source/textures-jpg/`. Layered wear, sand drift, albedo grading and the procedural decal atlas (stains, cracks, chips, posters, stencils) are original project work. Sahra's site and map names are original (A / MINARET, B / RIWAQ, SAHRA / 13); no Valve or Riot name, map, texture or asset is used.


## V36 — original OB weapon designs (photographed models)

Each design is a CC Attribution 4.0 model from Sketchfab, fitted into the game's existing first-person rigs at runtime (`dist/weapon-variants.js`); textures were resized to 2K/1K WebP and the files repacked (`dist/assets/models/v36/`). Author credit is required and commercial use is allowed; the Sketchfab API license records are kept in `art/source/v36/*/*-source.json`.

- **OB-50 TITANO** — *Desert Eagle*, ELIZION: https://sketchfab.com/3d-models/desert-eagle-cabde59f5cf24effaf80536e35d04e95
- **OB-45 VESPA** — *UMP_45mm*, TORI106: https://sketchfab.com/3d-models/ump-45mm-9f1c89e7d4764ff4bceffb6c67839c7a
- **OB-45 TORO** — *KRSV VECTOR*, h1ggs: https://sketchfab.com/3d-models/krsv-vector-609166faf8e5416f957c88e0af657e09
- **OB-7 SCIROCCO** — *AKSU-74 game ready*, Drus: https://sketchfab.com/3d-models/aksu-74-game-ready-3a735e998521443587b292cf52c3ac4e
- **OB-5 LEVANTE** — *Honey Badger*, bagusmars (bgsmars): https://sketchfab.com/3d-models/honey-badger-0328770df6fb4496ace40192b9d3793f
- **ARTIGLIO** — *Karambit*, Diamonddogkz: https://sketchfab.com/3d-models/karambit-dfd7606f189a413681305a39b8841ce8
- **FARFALLA** — *Butterfly Knife NOX Balisong*, Frobin_G (frobin): https://sketchfab.com/3d-models/butterfly-knife-nox-balisong-e2b7ed11b1b443c69bb6b3d7ce9aeed8
- **BOWIE OB** — *Well Seasoned Combat Knife*, kjetil myhren (kjetilmyhren): https://sketchfab.com/3d-models/well-seasoned-combat-knife-307a6384ffb14ef2a73f1783a92ae9bc

Downloaded but not shipped: *H&K MP7 A1* (Trinitite_Studio) and *[XYZ School] SCAR-H Draft* (barvipov); their files stay in `art/source/v36/` only. Modifications: texture downscale and WebP re-encoding, runtime scale/rotation/offset to the rig, magazine and bolt parts separated by node name (or by a bounding box for the UMP), laser beam and bullet props hidden.


## V37 — operator gear (photographed models)

The operators' helmets, masks, night-vision set, headset and backpacks are CC Attribution 4.0 models from Sketchfab, fitted at runtime to the body's own skeleton anchors (`dist/operator-kits.js`); textures were resized to 2K/1K WebP and the files repacked (`dist/assets/models/v37/`). Author credit is required and commercial use is allowed; the Sketchfab API license records are kept in `art/source/v37/*/*-source.json`.

- **passamontagna (TIRATORE)** — *Balaclava*, Alexander Kurmanin (kurmanin): https://sketchfab.com/3d-models/balaclava-da7ccabba333455db76ecf22c39e341f
- **pacco_teste (shemagh, maschera teschio, mezza maschera balistica)** — *Helmet Mask Shemagh Pack*, 00amza (00amza): https://sketchfab.com/3d-models/helmet-mask-shemagh-pack-1d1889514b5047189d64ea690777134a
- **zaino_b (ASSALTO, RICOGNIZIONE, TIRATORE)** — *Low Poly Game Ready Military Tactical Backpack*, DanlyVostok (1799danly): https://sketchfab.com/3d-models/low-poly-game-ready-military-tactical-backpack-95a4fc7300584384b56ce3add58dbc9f
- **casco_c (riserva, non usato nei kit)** — *Military Helmet*, ED BOX (Elyar): https://sketchfab.com/3d-models/military-helmet-7b344fdb2ce846539cb420fe4d37fc13
- **zaino_a (SFONDAMENTO)** — *Military Tactical Backpack*, Liam3D (liamch): https://sketchfab.com/3d-models/military-tactical-backpack-9fa2da2c42234b58896e8d23393cac24
- **casco_a (ASSALTO)** — *PBR Tactical Helmet*, Simon Coenen (simoncoenen): https://sketchfab.com/3d-models/pbr-tactical-helmet-ad5de2de22af429cbcaf2a96e3520b80
- **nvg (visore notturno ASSALTO)** — *Quad Night Vision Goggle*, VassKacsoHunor (VassKacsoHunor): https://sketchfab.com/3d-models/quad-night-vision-goggle-632dac677c02447abf205f503c50613e
- **antigas (SFONDAMENTO)** — *Russian GP-5  Gas Mask - (Filter Damaged)*, MattMakesSwords (frankthefish): https://sketchfab.com/3d-models/russian-gp-5-gas-mask-filter-damaged-a4cea22eddbf4e3fa7dd8d622642e635
- **cuffie (RICOGNIZIONE)** — *Tactical Headset - Game Ready*, Exactly (txyrm70): https://sketchfab.com/3d-models/tactical-headset-game-ready-c1cee56e73ed47438015a646ad82dfa5
- **casco_b (SFONDAMENTO)** — *Tactical Helmet with Headset (Game-Ready)*, Exactly (txyrm70): https://sketchfab.com/3d-models/tactical-helmet-with-headset-game-ready-82adf376164f4d99a4e0b2949930e2ad

Modifications: texture downscale and WebP re-encoding, runtime scale/rotation/offset to the rig, the rigged gas mask baked to a static mesh, meshes of one material merged, the low-poly backpack's specular-glossiness material converted to metallic-roughness.


## V38 — street dressing (photographed props)

Roof clutter, wall condensers, boats and the re-skinned cover (dumpsters) are CC Attribution 4.0 models from Sketchfab, placed by `dist/street-props.js` as instanced cosmetic meshes or inside the exact collision boxes of the cover they replace; textures were resized to 1K WebP and the files repacked (`dist/assets/models/v38/`). Author credit is required and commercial use is allowed; the Sketchfab API license records are kept in `art/source/v38/*/*-source.json`.

- **condizionatore (non usato: unità interna)** — *Air Conditioner*, Daniyal Malik (daniyalmalik): https://sketchfab.com/3d-models/air-conditioner-777cbe0d26aa4f1588050419ec24f4e4
- **condizionatori: condensatori a parete e impianto da tetto** — *air conditioners*, Lora (Lora_o): https://sketchfab.com/3d-models/air-conditioners-65417369a2724c9ebf06e7698238a856
- **cassonetto (Caldera)** — *Dumpster*, txnomod (txnomod): https://sketchfab.com/3d-models/dumpster-337b3a4424b745699cda776545070e04
- **barca (mare di Caldera)** — *Fishing Boat*, yorre.detavernier (yorre.detavernier): https://sketchfab.com/3d-models/fishing-boat-91aa32c513874d368f84eda14095068e
- **generatore carrellato (rooftop generators)** — *Generator Trailer*, Batuhan13 (Batuhan13): https://sketchfab.com/3d-models/generator-trailer-c07a679eadb64c15b26cb063b8a736ae
- **barriera jersey (downloaded, not shipped)** — *Jersey Barrier*, bilgehan.korkmaz (bilgehan.korkmaz): https://sketchfab.com/3d-models/jersey-barrier-0c5443577a07489694fa295d01478388
- **muletto (downloaded, not shipped)** — *Low poly Forklift Truck*, Kolos Studios (KolosStudios): https://sketchfab.com/3d-models/low-poly-forklift-truck-81b895de490646de8c6fb1ba03099e08
- **barile** — *Rusty Metal Barrel - Inspired Industrial Prop*, Vlaxled (Vo_plex): https://sketchfab.com/3d-models/rusty-metal-barrel-inspired-industrial-prop-0d03d043bb1647849a36a5c8dee0fafd
- **sacco di sabbia** — *Sandbag [Low Poly Realist]*, Islide (Islide): https://sketchfab.com/3d-models/sandbag-low-poly-realist-7d52600a15c747749d845d9f906045cf
- **cassa (sui pallet)** — *Wooden Crate*, YadroGames (yadrogames): https://sketchfab.com/3d-models/wooden-crate-e12fde1101b84b6da40056336a7b309d
- **pallet** — *Wooden Pallets*, YadroGames (yadrogames): https://sketchfab.com/3d-models/wooden-pallets-dba5c00928cd400796d9f6fffdd724b3

Modifications: texture downscale and WebP re-encoding, specular-glossiness materials converted to metallic-roughness, parts cut out of packs by bounding box, meshes merged per material, runtime scale/rotation/offset.


## V39 — photographed cover and street fixtures

CC Attribution 4.0 models from Sketchfab, placed by `dist/street-props.js`.

- **palma (Sahra)** — *Date Palm*, evolveduk (evolveduk): https://sketchfab.com/3d-models/date-palm-11acf710e6c149daa8d6fb8cdc5d087f
- **casse** — *Wooden Boxes*, MaX3Dd (MaX3Dd): https://sketchfab.com/3d-models/wooden-boxes-ddecbe4586594bddb4822a90c0cba222
- **compensato (cataste)** — *Pallet Plywood GameReady*, Gerhald (Gerhald): https://sketchfab.com/3d-models/pallet-plywood-gameready-efd63a856c554480b93f5442f4df1f10
- **container** — *Shipping containers*, SpatialNeglect (jeandiz): https://sketchfab.com/3d-models/shipping-containers-cc3f7136710f4905905eae1d10ac50b7
- **quadro elettrico** — *Electrical Box On The Wall _ 5MB*, Mehdi Shahsavan (ahmagh2e): https://sketchfab.com/3d-models/electrical-box-on-the-wall---5mb-6f92c92bf3954940883adcf50a10142b
- **plafoniera** — *Industrial Bulkhead Wall Lamp Lowpoly*, iwanPlays (iwanPlays): https://sketchfab.com/3d-models/industrial-bulkhead-wall-lamp-lowpoly-4c50439bcbc247629fe2194862d7acc9
- **tested, not shipped** — *Industrial asset pack (Free)*, ForevereQ (ForevereQ): https://sketchfab.com/3d-models/industrial-asset-pack-free-94c5011772a84e8791779b342467f245

Modifications: polygon reduction (crates, palm), texture downscale and WebP re-encoding, one container of the pack kept with its lettering painted out and a recoloured teal variant, parts cut out of packs by bounding box, per-axis stretch to the collision boxes, meshes merged per material.


## V40 — lived-in detail on all three maps

CC Attribution 4.0 models from Sketchfab, placed by `dist/detail-dress.js` and `dist/street-props.js`.

- **porta intagliata (Sahra)** — *Old wooden Door*, Ellie3D (Ellie3D): https://sketchfab.com/3d-models/old-wooden-door-1cec090cd02142b094802d242e03ee7c
- **lanterna del souk** — *Lowpoly moroccan lantern*, n-malmberg (n-malmberg): https://sketchfab.com/3d-models/lowpoly-moroccan-lantern-e9f56aaea13546ad8b889d5ccc47edd8
- **tappeto** — *Persian Rug*, Nicholas Record (nrecord): https://sketchfab.com/3d-models/persian-rug-fe13eecfc9b8405dab1fe76c5dd28a4c
- **tappeto a riquadri** — *Persian Qashqai Rug*, mfb64 (mfb64): https://sketchfab.com/3d-models/persian-qashqai-rug-fa968bf5d57a4265bedb233293870dc2
- **bucato tra i palazzi** — *Laundry Clothesline*, Khoa Nguyen (ngdkh): https://sketchfab.com/3d-models/laundry-clothesline-6f13cc3c463f43888fb5db634cc603aa
- **parabola sui tetti** — *Rusty House Satellite Dish*, TomasKiniulis (TomasKiniulis): https://sketchfab.com/3d-models/rusty-house-satellite-dish-929f056abe02416da19d7b1aa805d235
- **cisterna sui tetti** — *Overhead Water tank*, Nodeaxis Interactive (ar.jethin): https://sketchfab.com/3d-models/overhead-water-tank-1745c92e50b441c6bf6588e11cdba538
- **tombino** — *Manhole Cover*, Albn (luvarv): https://sketchfab.com/3d-models/manhole-cover-c35106a9f8ef4c31a79665e0cb04bd72
- **sacchi della spazzatura** — *Garbage bags*, DJMaesen (bumstrum): https://sketchfab.com/3d-models/garbage-bags-9e769751ac3a4b6a893a5719349b78ca
- **vasi sui davanzali** — *Assorted Old Pots*, Kigha (Kigha): https://sketchfab.com/3d-models/assorted-old-pots-7795c6a5fa144bfcb1c33041c71eab00
- **nave portacontainer (Caldera)** — *Container Ship*, LavaWave (lavawave): https://sketchfab.com/3d-models/container-ship-4f7cf10593824061bfe2e36ffd823cde
- **gru portuale (Caldera)** — *Port crane "Sokol"*, Vitaliy Kovalchuk (Domender): https://sketchfab.com/3d-models/port-crane-sokol-4964eaa7634e47c9bac4c2a74fa91c20
- **faro (Caldera)** — *Phare de Ouistreham LOWPOLY*, Vlasov Daniil (dan741vlasov): https://sketchfab.com/3d-models/phare-de-ouistreham-lowpoly-f4c4bc0bdfe14e35bc08e6221a35802e
- **boa (Caldera)** — *Port Mesh Buoy2*, john.simmons.hypertext (john.simmons.hypertext): https://sketchfab.com/3d-models/port-mesh-buoy2-6da81c3d87bd4d1da56503d371ef5b15
- **salvagente (Caldera)** — *Stylized Low Poly Lifebuoy (Game Ready)*, Muyaya Concept (muyayaconcept): https://sketchfab.com/3d-models/stylized-low-poly-lifebuoy-game-ready-1cbc373d57e9471ab04f9e53949911d1
- **turbina eolica (Caldera)** — *Wind Turbine*, Shivansh Singh (ShivanshSingh): https://sketchfab.com/3d-models/wind-turbine-285032402a8543ae8bf3e3c4d8c9f98a
- **pannello solare** — *Solar Panel*, rivetech (rivetech): https://sketchfab.com/3d-models/solar-panel-83483a66f8974d7e8f2e7bbde518d606
- **scogli e molo (Caldera)** — *Rockface Collection 3*, That's Cool Jack (thats_cool_jack): https://sketchfab.com/3d-models/rockface-collection-3-b8dc2f079fa3418b8ac1031490f8c0eb
- **traliccio (Forge)** — *400Kv Transmission Tower Low Poly Model*, manh21 (manh21): https://sketchfab.com/3d-models/400kv-transmission-tower-low-poly-model-675553d3b2004d72b68c04a5d147d0bd
- **abete (Forge)** — *Pine Tree [Game-ready]*, Wenedi (^-^)/ (Wenedi): https://sketchfab.com/3d-models/pine-tree-game-ready-dc3fbd9205cf4027a4455d1f415e0478
- **valvola (Forge)** — *Iron Valve Wheel*, Luke.G (LukeCG): https://sketchfab.com/3d-models/iron-valve-wheel-8ec3518543b74d229725783e7d725c11
- **estintore** — *Neglected Fire Extinguisher*, JJ Chalupnik (jjchalupnik): https://sketchfab.com/3d-models/neglected-fire-extinguisher-5809f034270947ecb32b597ed9e80afd
- **telecamera di sorveglianza** — *CCTV Camera*, Smoggybeard (Smoggybeard): https://sketchfab.com/3d-models/cctv-camera-e69d5eb37ffb4f188e4d3c84a5d79cdc
- **scala a parete** — *Ladder*, FrodoUndead (FrodoUndead): https://sketchfab.com/3d-models/ladder-92bab3b15803415e93505f63498f7c4d
- **condotto di ventilazione (Forge)** — *Ventilation*, Bluenoseddonkey (Bluenoseddonkey): https://sketchfab.com/3d-models/ventilation-c082be85a9b14d8991def67324939ec5
- **tested, not shipped** — *Pigeon*, FourthGreen (FourthGreen): https://sketchfab.com/3d-models/pigeon-5884a0f5200c44ceaa7d0399bea577f9

Modifications: polygon reduction, rig baked to static geometry (door), texture downscale and WebP re-encoding, parts cut out of packs by bounding box, per-axis stretch, wind motion in the vertex shader, emissive added to the lantern, metalness reduced on the duct and valve.
