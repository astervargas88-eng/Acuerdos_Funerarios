/**
 * Native signature pad using react-native-signature-canvas (WebView-based).
 * This file is used on iOS/Android only.
 */
import { forwardRef, useImperativeHandle, useRef } from "react";
import { View, StyleSheet } from "react-native";
import SignatureCanvas from "react-native-signature-canvas";

export type SignaturePadRef = {
  clear: () => void;
  getBase64: () => string | null; // not used on native — onSigned callback is used instead
};

type Props = {
  onSigned?: (base64: string | null) => void;
  height?: number;
};

const SignaturePad = forwardRef<SignaturePadRef, Props>(({ onSigned, height = 220 }, ref) => {
  const sigRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    clear: () => {
      sigRef.current?.clearSignature();
      onSigned?.(null);
    },
    getBase64: () => null, // on native, use sigRef.current?.readSignature() + onOK callback
  }));

  return (
    <View style={[styles.wrapper, { height }]}>
      <SignatureCanvas
        ref={sigRef}
        onOK={(sig: string) => onSigned?.(sig)}
        onEmpty={() => onSigned?.(null)}
        descriptionText=""
        clearText=""
        confirmText=""
        webStyle={`
          .m-signature-pad { box-shadow: none; border: none; background: #1C1C1C; }
          .m-signature-pad--body { background: #1C1C1C; border-radius: 0; }
          .m-signature-pad--footer { display: none; }
          body, html { background: #1C1C1C; margin: 0; padding: 0; }
          canvas { background: #1C1C1C; }
        `}
        autoClear={false}
        style={{ flex: 1, height, backgroundColor: "#1C1C1C" }}
      />
    </View>
  );
});

SignaturePad.displayName = "SignaturePad";
export default SignaturePad;

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    backgroundColor: "#1C1C1C",
    borderRadius: 10,
    overflow: "hidden",
  },
});
