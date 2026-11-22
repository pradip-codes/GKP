import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Icon } from './Icon';

interface FloatingInputProps {
  label: string;
  icon?: string;
  value: string;
  onChangeText: (t: string) => void;
  /** Optional fixed prefix rendered inside the field (e.g. "+91") */
  prefix?: string;
  rightElement?: React.ReactNode;
  secureTextEntry?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  multiline?: boolean;
  autoFocus?: boolean;
  editable?: boolean;
  containerStyle?: any;
}

/**
 * Material-style floating label input.
 * - No separate heading; the label is the placeholder inside the field
 * - On focus or when text is entered, the label floats up onto the top border
 * - Border-only field (no filled background), border highlights on focus
 */
export const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  icon,
  value,
  onChangeText,
  prefix,
  rightElement,
  containerStyle,
  multiline,
  ...inputProps
}) => {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;

  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: focused ? colors.primary : colors.border,
          backgroundColor: colors.card,
        },
        multiline && styles.wrapMultiline,
        containerStyle,
      ]}
    >
      {prefix ? (
        <View style={[styles.prefixBox, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.prefixText, { color: colors.textMid }]}>{prefix}</Text>
        </View>
      ) : null}
      {icon ? (
        <Icon name={icon} size={16} color={focused ? colors.primary : colors.textLight} />
      ) : null}
      <TextInput
        style={[
          styles.input,
          { color: colors.text },
          multiline && styles.inputMultiline,
        ]}
        placeholder={label}
        placeholderTextColor={colors.textLight}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...inputProps}
      />
      {rightElement}
      {floated && (
        <Text
          style={[
            styles.floatingLabel,
            {
              color: focused ? colors.primary : colors.textMid,
              backgroundColor: colors.card,
              left: prefix ? 62 : icon ? 38 : 10,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 54,
  },
  wrapMultiline: {
    height: undefined,
    minHeight: 90,
    alignItems: 'flex-start',
    paddingTop: 14,
  },
  prefixBox: {
    borderWidth: 1,
    borderRightWidth: 0,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 8,
  },
  prefixText: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
    marginLeft: 8,
  },
  inputMultiline: {
    marginTop: 14,
    textAlignVertical: 'top',
    minHeight: 56,
  },
  floatingLabel: {
    position: 'absolute',
    top: -8,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 5,
    letterSpacing: 0.3,
  },
});

export default FloatingInput;
