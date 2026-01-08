// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract BatchOpenVerifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 20491192805390485299153009773594534940189261866228447918068658471970481763042;
    uint256 constant alphay  = 9383485363053290200918347156157836566562967994039712273449902621266178545958;
    uint256 constant betax1  = 4252822878758300859123897981450591353533073413197771768651442665752259397132;
    uint256 constant betax2  = 6375614351688725206403948262868962793625744043794305715222011528459656738731;
    uint256 constant betay1  = 21847035105528745403288232691147584728191162732299865338377159692350059136679;
    uint256 constant betay2  = 10505242626370262277552901082094356697409835680220590971873171140371331206856;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant deltax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant deltay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant deltay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;

    
    uint256 constant IC0x = 15055437701605879143542175237321673704038734152500704253403708096792418485003;
    uint256 constant IC0y = 6496537882267333474963907115911015262732318100389683777399753902034009597929;
    
    uint256 constant IC1x = 17225855317399778265600102838172408705531197708265363525897523749294960243113;
    uint256 constant IC1y = 17772903452021083159823503256848518631140228143482878045278732272974691812686;
    
    uint256 constant IC2x = 3046617207364912038715966611097320433082174313406733345439041742658957138784;
    uint256 constant IC2y = 18496447717245457877776618472122372314831822523958484453199070865464481520010;
    
    uint256 constant IC3x = 6251643225535452884954829496936809406499807452710120906779962071957260865558;
    uint256 constant IC3y = 5063801998896463477915125218866577835436590639281328079662294487138953235695;
    
    uint256 constant IC4x = 21851865046427674141984238568280154990259205645230501521051356437636738800114;
    uint256 constant IC4y = 16182830395276145892041024459556088806235384782237746985678009036877801918645;
    
    uint256 constant IC5x = 5372603365396988461103184937946307642765073478395778462294270343905225184628;
    uint256 constant IC5y = 12464443915890151896417172061344561759634336742512071382631016012521573124562;
    
    uint256 constant IC6x = 15197788958950065955760451757832523789166551931751781728982551605752710921806;
    uint256 constant IC6y = 13694015130977496522103058752431747710209953971708262466810844574055192944432;
    
    uint256 constant IC7x = 11863064334302560422904504235610906487090698924868539860826617698194526065209;
    uint256 constant IC7y = 4946319527277902786340130680925132006305576718364628302381025236381390874751;
    
    uint256 constant IC8x = 20841018574670864756072781732119273984737841460149700869780487842681335527155;
    uint256 constant IC8y = 15441681825203743832577501381241217862499460295502621922990396219876432045434;
    
    uint256 constant IC9x = 19771718772601105959668782742702211333527627956477243431598892653607483005083;
    uint256 constant IC9y = 10950302456283483475552414222152073115410023605411245556533863647857062973450;
    
    uint256 constant IC10x = 7346435817767316066052232531140494939650229093150636846329056375762634002196;
    uint256 constant IC10y = 4050459723432597452585686736562533968965443479443188339603522537018432689324;
    
    uint256 constant IC11x = 6001146047741581836772400138476965228140830059139255409167080507133877525484;
    uint256 constant IC11y = 3298329909646890382713577918626758457057829678743632096652066482079325940071;
    
    uint256 constant IC12x = 5928801144800998832135437616715210518064422542845694115774751291220305683383;
    uint256 constant IC12y = 15591155721527780965380319869351806298234949482862756243943429832937019659206;
    
    uint256 constant IC13x = 13492239379763109406152478089176052041098860046956937595147873713148377224841;
    uint256 constant IC13y = 10389494929109272197280479458102017013135208966246800733494574047879712580977;
    
    uint256 constant IC14x = 19704370971985738265580523037575530996590668718506999720776291532309952247011;
    uint256 constant IC14y = 8152970525941872149123646485323340425150088518088015871717298775094758258665;
    
    uint256 constant IC15x = 14759346533374389194266081614328206322459012512740675625019592395684170689019;
    uint256 constant IC15y = 6404454123795211402925478960502593202955359059269350239142843582464522692025;
    
    uint256 constant IC16x = 21841898564677825547777268176183370152021103924607470389288514012701190233892;
    uint256 constant IC16y = 10990666998793095344164947595591009745999417503600056482381003774886107953162;
    
    uint256 constant IC17x = 1218192971750037396668627420668542591955265500193607772161738241991344091739;
    uint256 constant IC17y = 8160235159298211675964859543718216957727785234690773265132017427873865953819;
    
    uint256 constant IC18x = 17245393515375755905254911512615179126574342031120825704300790250159472087775;
    uint256 constant IC18y = 16362784073481688127043504501932963446869637688680084203784189318640843720344;
    
    uint256 constant IC19x = 5552615890667995727519777663761222627905231702651314163265512849125954108011;
    uint256 constant IC19y = 18161344702069341887123372690216151408657745001111937669835574470795034076709;
    
    uint256 constant IC20x = 15962929354451826647868035445280112698330824738878620724608944501093297245994;
    uint256 constant IC20y = 12336745336259688188747860011500964447574467896900788333069920779850893686264;
    
    uint256 constant IC21x = 10076695862792485520850824270572593506449605471873676975058767149594271786459;
    uint256 constant IC21y = 19100697346704045010160645415634055813275475889314900537792787416015411621830;
    
    uint256 constant IC22x = 4117417446794912734948804983802955646433432350841068395137498811020518464748;
    uint256 constant IC22y = 5529255525745482760335449756804654565431509652861207869229910565952984197518;
    
    uint256 constant IC23x = 2787223102070646650202460449450929877412047931347016293828934288235029588205;
    uint256 constant IC23y = 3112646880446560215192330578771036521184724883982270456247403169047860695408;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[23] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                
                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))
                
                g1_mulAccC(_pVk, IC14x, IC14y, calldataload(add(pubSignals, 416)))
                
                g1_mulAccC(_pVk, IC15x, IC15y, calldataload(add(pubSignals, 448)))
                
                g1_mulAccC(_pVk, IC16x, IC16y, calldataload(add(pubSignals, 480)))
                
                g1_mulAccC(_pVk, IC17x, IC17y, calldataload(add(pubSignals, 512)))
                
                g1_mulAccC(_pVk, IC18x, IC18y, calldataload(add(pubSignals, 544)))
                
                g1_mulAccC(_pVk, IC19x, IC19y, calldataload(add(pubSignals, 576)))
                
                g1_mulAccC(_pVk, IC20x, IC20y, calldataload(add(pubSignals, 608)))
                
                g1_mulAccC(_pVk, IC21x, IC21y, calldataload(add(pubSignals, 640)))
                
                g1_mulAccC(_pVk, IC22x, IC22y, calldataload(add(pubSignals, 672)))
                
                g1_mulAccC(_pVk, IC23x, IC23y, calldataload(add(pubSignals, 704)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            
            checkField(calldataload(add(_pubSignals, 224)))
            
            checkField(calldataload(add(_pubSignals, 256)))
            
            checkField(calldataload(add(_pubSignals, 288)))
            
            checkField(calldataload(add(_pubSignals, 320)))
            
            checkField(calldataload(add(_pubSignals, 352)))
            
            checkField(calldataload(add(_pubSignals, 384)))
            
            checkField(calldataload(add(_pubSignals, 416)))
            
            checkField(calldataload(add(_pubSignals, 448)))
            
            checkField(calldataload(add(_pubSignals, 480)))
            
            checkField(calldataload(add(_pubSignals, 512)))
            
            checkField(calldataload(add(_pubSignals, 544)))
            
            checkField(calldataload(add(_pubSignals, 576)))
            
            checkField(calldataload(add(_pubSignals, 608)))
            
            checkField(calldataload(add(_pubSignals, 640)))
            
            checkField(calldataload(add(_pubSignals, 672)))
            
            checkField(calldataload(add(_pubSignals, 704)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
