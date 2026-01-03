#!/bin/bash

FULL_PATH=$1
CIRCUIT_NAME=$(basename $FULL_PATH)
CIRCUIT_NAME=${CIRCUIT_NAME:=test}
CIRCUIT_PATH=$(dirname "$FULL_PATH")
MAIN_NAME=${CIRCUIT_NAME}_main

set -e # stop for errors

# If CIRCUIT_PATH is "." or empty, default to circuits/src
if [ "$CIRCUIT_PATH" = "." ] || [ -z "$CIRCUIT_PATH" ]; then
    CIRCUIT_PATH="circuits/src"
fi

mkdir -p ./ui/src/generated/

TARGET_FILE="./ui/src/generated/${CIRCUIT_NAME}Verifier.sol"
cp ${CIRCUIT_PATH}/${MAIN_NAME}_obj/verifier.sol $TARGET_FILE

TMP_FILE="${TARGET_FILE}.tmp"
sed "s/Groth16Verifier/${CIRCUIT_NAME}Verifier/g" "$TARGET_FILE" > "$TMP_FILE"

mv "$TMP_FILE" "$TARGET_FILE"

mkdir -p ./test/circuits_generator

cp ${CIRCUIT_PATH}/${MAIN_NAME}_obj/${MAIN_NAME}_js/${MAIN_NAME}.wasm ./test/circuits_generator/${CIRCUIT_NAME}.wasm
cp ${CIRCUIT_PATH}/${MAIN_NAME}_obj/${MAIN_NAME}_final.zkey ./test/circuits_generator/${CIRCUIT_NAME}_final.zkey
cp ${CIRCUIT_PATH}/${MAIN_NAME}_obj/verification_key.json ./test/circuits_generator/${CIRCUIT_NAME}_vkey.json
