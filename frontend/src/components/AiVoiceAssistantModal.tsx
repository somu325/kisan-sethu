import { useState, useEffect, useRef, type FC } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Pressable,
  StyleSheet
} from 'react-native';
import type { Language, MandiItem, LocationOption } from '../types/index.ts';
import { translations } from '../data/i18n.ts';
import { useVoiceAssistant } from '../features/voiceAssistant/index.ts';
import type { ChatMessage, MandiCardData } from '../features/voiceAssistant/types.ts';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  X,
  MapPin,
  Navigation,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

export interface AiVoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  activeMandi: MandiItem;
  isAiModeEnabled: boolean;
  onToggleAiMode: (enabled: boolean) => void;
  currentLocation?: LocationOption;
  onNavigateToMarket?: (marketId: string) => void;
  onOpenLocationModal?: () => void;
}

export const AiVoiceAssistantModal: FC<AiVoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  isAiModeEnabled,
  onToggleAiMode,
  currentLocation,
  onNavigateToMarket,
  onOpenLocationModal
}) => {
  const t = translations[currentLang] || translations.en;
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<any>(null);

  const {
    state,
    transcript,
    messages,
    error,
    isPermissionDenied,
    startListening,
    stopListening,
    sendText,
    stopSpeaking,
    replay
  } = useVoiceAssistant({
    language: currentLang,
    location: currentLocation,
    autoGreetOnMount: isOpen && isAiModeEnabled
  });

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, transcript, isOpen]);

  if (!isOpen) return null;

  const handleMicPress = () => {
    if (state === 'listening') {
      stopListening();
    } else if (state === 'speaking') {
      stopSpeaking();
      startListening();
    } else {
      startListening();
    }
  };

  const handleSendText = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    sendText(text);
  };

  const handleDirections = (card: MandiCardData) => {
    if (card.latitude && card.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${card.latitude},${card.longitude}`;
      window.open(url, '_blank');
    }
  };

  const handleShowOnMap = (card: MandiCardData) => {
    onClose();
    onNavigateToMarket?.(card.id);
  };

  return (
    <Modal visible={isOpen} transparent={true} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.branding}>
              <View style={styles.avatar}>
                <Image
                  source={{ uri: '/brinjal.png' }}
                  style={{ width: 26, height: 26 }}
                  resizeMode="contain"
                />
                {isAiModeEnabled && <View style={styles.pulseDot} />}
              </View>
              <View>
                <Text style={styles.title}>{t.voiceAssistantTitle}</Text>
                <Text style={styles.subtitle}>{t.voiceAssistantSubtitle}</Text>
              </View>
            </View>

            <View style={styles.controls}>
              <View style={styles.switchPill}>
                <Text style={styles.switchLabel}>
                  {isAiModeEnabled ? t.aiAssistantEnable : t.aiAssistantDisable}
                </Text>
                <Switch
                  value={isAiModeEnabled}
                  onValueChange={onToggleAiMode}
                  trackColor={{ false: '#475569', true: '#00E676' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <X size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {!isAiModeEnabled ? (
            <View style={styles.disabledCard}>
              <View style={styles.disabledIcon}>
                <MicOff size={32} color="#94A3B8" />
              </View>
              <Text style={styles.disabledHeading}>
                {currentLang === 'hi'
                  ? 'एआई वॉइस सहायक बंद है'
                  : currentLang === 'te'
                    ? 'AI వాయిస్ అసిస్టెంట్ ఆఫ్ చేయబడింది'
                    : 'AI Voice Assistant is Disabled'}
              </Text>
              <Text style={styles.disabledText}>
                {currentLang === 'hi'
                  ? 'बोलकर प्रश्न पूछने हेतु ऊपर दिए गए स्विच से एआई मोड चालू करें।'
                  : currentLang === 'te'
                    ? 'ప్రశ్నలు అడగడానికి పైన ఉన్న స్విచ్ ద్వారా AI మోడ్ ఆన్ చేయండి.'
                    : 'Toggle the switch above to enable smart voice farm advisory.'}
              </Text>
              <TouchableOpacity
                onPress={() => onToggleAiMode(true)}
                style={styles.enableBtn}
                activeOpacity={0.8}
              >
                <Sparkles size={16} color="#FFE600" />
                <Text style={styles.enableBtnText}>{t.aiAssistantEnable}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mainContainer}>
              {/* Status & Waveform Bar */}
              <View
                style={[
                  styles.statusBar,
                  state === 'listening' && styles.statusBarListening,
                  state === 'speaking' && styles.statusBarSpeaking
                ]}
              >
                <View style={styles.statusLeft}>
                  {state === 'listening' ? (
                    <View style={styles.waveRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 18 }}>
                        <span className="ks-wave-bar" />
                        <span className="ks-wave-bar" />
                        <span className="ks-wave-bar" />
                        <span className="ks-wave-bar" />
                        <span className="ks-wave-bar" />
                      </View>
                      <Text style={styles.statusTextListening}>🎙️ {t.assistantStateListening}</Text>
                    </View>
                  ) : state === 'thinking' ? (
                    <Text style={styles.statusTextThinking}>⚡ {t.assistantStateThinking}</Text>
                  ) : state === 'speaking' ? (
                    <Text style={styles.statusTextSpeaking}>🔊 {t.assistantStateSpeaking}</Text>
                  ) : (
                    <Text style={styles.statusTextIdle}>✨ {t.assistantStateIdle}</Text>
                  )}
                </View>

                {state === 'speaking' && (
                  <TouchableOpacity onPress={stopSpeaking} style={styles.stopSpeechBtn} activeOpacity={0.7}>
                    <VolumeX size={14} color="#DC2626" />
                    <Text style={styles.stopSpeechText}>{t.assistantStopSpeech || 'Stop'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Live Transcript Banner */}
              {transcript.trim() !== '' && (
                <View style={styles.transcriptBanner}>
                  <Text style={styles.transcriptLabel}>
                    {currentLang === 'hi' ? 'सुनाई दे रहा है:' : currentLang === 'te' ? 'వినిపించినది:' : 'Heard:'}
                  </Text>
                  <Text style={styles.transcriptText}>"{transcript}"</Text>
                </View>
              )}

              {/* Permission / Error Notice */}
              {isPermissionDenied && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{t.assistantMicDenied}</Text>
                </View>
              )}

              {error && !isPermissionDenied && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              )}

              {/* Chat Thread */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.chatScroll}
                contentContainerStyle={styles.chatContent}
                showsVerticalScrollIndicator={true}
              >
                {messages.map((msg: ChatMessage) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageRow,
                      msg.role === 'user' ? styles.userMessageRow : styles.assistantMessageRow
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        msg.role === 'user' ? styles.userBubble : styles.assistantBubble
                      ]}
                    >
                      <Text
                        style={[
                          styles.bubbleText,
                          msg.role === 'user' ? styles.userBubbleText : styles.assistantBubbleText
                        ]}
                      >
                        {msg.text}
                      </Text>

                      {/* Mandi Cards List */}
                      {msg.cards && msg.cards.length > 0 && (
                        <View style={styles.cardsContainer}>
                          {msg.cards.map((card) => (
                            <View key={card.id} style={styles.mandiCard}>
                              {/* Card Header: Name + Badge */}
                              <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle} numberOfLines={2}>
                                  {card.name}
                                </Text>
                                <View
                                  style={[
                                    styles.typeBadge,
                                    card.type === 'APMC' ? styles.badgeApmc : styles.badgeMandi
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.badgeText,
                                      card.type === 'APMC' ? styles.badgeTextApmc : styles.badgeTextMandi
                                    ]}
                                  >
                                    {card.type}
                                  </Text>
                                </View>
                              </View>

                              {/* Distance & District Row */}
                              <View style={styles.cardMetaRow}>
                                <View style={styles.metaItem}>
                                  <MapPin size={13} color="#15803D" />
                                  <Text style={styles.distanceText}>
                                    {card.distanceKm} km {currentLang === 'hi' ? 'दूर' : currentLang === 'te' ? 'దూరం' : 'away'}
                                  </Text>
                                </View>
                                {card.district && (
                                  <Text style={styles.districtText}>• {card.district}</Text>
                                )}
                              </View>

                              {card.address && (
                                <Text style={styles.addressText} numberOfLines={2}>
                                  {card.address}
                                </Text>
                              )}

                              {/* Card Actions */}
                              <View style={styles.cardActionsRow}>
                                <TouchableOpacity
                                  onPress={() => handleShowOnMap(card)}
                                  style={styles.showOnMapBtn}
                                  activeOpacity={0.8}
                                >
                                  <Navigation size={13} color="#FFFFFF" />
                                  <Text style={styles.showOnMapText}>{t.showOnMapBtn}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => handleDirections(card)}
                                  style={styles.directionsBtn}
                                  activeOpacity={0.8}
                                >
                                  <ExternalLink size={13} color="#2D5A27" />
                                  <Text style={styles.directionsText}>{t.directionsBtn}</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Action Chips */}
                      {msg.actions && msg.actions.length > 0 && (
                        <View style={styles.actionsWrap}>
                          {msg.actions.map((act) => (
                            <TouchableOpacity
                              key={act.id}
                              onPress={() => {
                                if (act.actionType === 'query' && act.payload) {
                                  sendText(act.payload);
                                } else if (act.actionType === 'open_location') {
                                  onClose();
                                  onOpenLocationModal?.();
                                }
                              }}
                              style={styles.actionChip}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.actionChipText}>📍 {act.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Assistant Bubble Footer: Replay Audio Button */}
                      {msg.role === 'assistant' && msg.speechText && (
                        <View style={styles.bubbleFooter}>
                          <TouchableOpacity
                            onPress={() => replay(msg.id)}
                            style={styles.replayBtn}
                            activeOpacity={0.7}
                          >
                            <Volume2 size={13} color="#15803D" />
                            <Text style={styles.replayText}>
                              {t.assistantReplaySpeech || 'Listen'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Quick Suggestion Chips */}
              <View style={styles.suggestionsContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionsRow}
                >
                  <TouchableOpacity
                    onPress={() => sendText(t.nearestMandiChip)}
                    style={styles.suggestionChip}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionChipText}>📍 {t.nearestMandiChip}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Bottom Input & Mic Bar */}
              <View style={styles.footerInputBar}>
                <TouchableOpacity
                  onPress={handleMicPress}
                  style={[
                    styles.bigMicBtn,
                    state === 'listening' && styles.bigMicBtnListening
                  ]}
                  // @ts-ignore
                  className={state === 'listening' ? 'ks-voice-mic-listening' : ''}
                  activeOpacity={0.8}
                >
                  {state === 'listening' ? (
                    <Mic size={24} color="#FFFFFF" />
                  ) : state === 'speaking' ? (
                    <Volume2 size={24} color="#FFFFFF" />
                  ) : (
                    <Mic size={22} color="#FFFFFF" />
                  )}
                </TouchableOpacity>

                <View style={styles.textInputWrap}>
                  <TextInput
                    style={styles.textInput}
                    placeholder={t.askAiPlaceholder}
                    placeholderTextColor="#94A3B8"
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={handleSendText}
                  />
                  <TouchableOpacity
                    onPress={handleSendText}
                    style={styles.sendIconBtn}
                    activeOpacity={0.8}
                  >
                    <Send size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  dialog: {
    width: '100%',
    maxWidth: 580,
    height: '86%',
    maxHeight: 720,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    backgroundColor: '#1E3F1A',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#2D5A27',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  pulseDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E676'
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  subtitle: {
    fontSize: 11,
    color: '#CBD5E1'
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  switchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 16
  },
  switchLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E2E8F0'
  },
  closeBtn: {
    padding: 4
  },
  disabledCard: {
    padding: 36,
    alignItems: 'center',
    gap: 12
  },
  disabledIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  disabledHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B'
  },
  disabledText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18
  },
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2D5A27',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8
  },
  enableBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  statusBar: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusBarListening: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC'
  },
  statusBarSpeaking: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D'
  },
  statusLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statusTextListening: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D'
  },
  statusTextThinking: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706'
  },
  statusTextSpeaking: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309'
  },
  statusTextIdle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  stopSpeechBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  stopSpeechText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626'
  },
  transcriptBanner: {
    backgroundColor: '#ECFDF5',
    borderBottomWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46'
  },
  transcriptText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#047857',
    flex: 1
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  errorBannerText: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '600',
    flex: 1
  },
  chatScroll: {
    flex: 1
  },
  chatContent: {
    padding: 16,
    gap: 12
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%'
  },
  userMessageRow: {
    justifyContent: 'flex-end'
  },
  assistantMessageRow: {
    justifyContent: 'flex-start'
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 12,
    gap: 8
  },
  userBubble: {
    backgroundColor: '#2D5A27',
    borderBottomRightRadius: 4
  },
  assistantBubble: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 19
  },
  userBubbleText: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  assistantBubbleText: {
    color: '#1E293B'
  },
  cardsContainer: {
    marginTop: 6,
    gap: 10
  },
  mandiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  badgeApmc: {
    backgroundColor: '#DCFCE7'
  },
  badgeMandi: {
    backgroundColor: '#FEF3C7'
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800'
  },
  badgeTextApmc: {
    color: '#15803D'
  },
  badgeTextMandi: {
    color: '#B45309'
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D'
  },
  districtText: {
    fontSize: 11,
    color: '#64748B'
  },
  addressText: {
    fontSize: 11,
    color: '#64748B'
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#F1F5F9'
  },
  showOnMapBtn: {
    flex: 1,
    backgroundColor: '#2D5A27',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8
  },
  showOnMapText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  directionsBtn: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8
  },
  directionsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D5A27'
  },
  actionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6
  },
  actionChip: {
    backgroundColor: '#EAF4E8',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534'
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4
  },
  replayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10
  },
  replayText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D'
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#F1F5F9'
  },
  suggestionsRow: {
    gap: 8
  },
  suggestionChip: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16
  },
  suggestionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D'
  },
  footerInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10
  },
  bigMicBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2D5A27',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D5A27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  bigMicBtnListening: {
    backgroundColor: '#15803D'
  },
  textInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingLeft: 14,
    paddingRight: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  textInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    paddingVertical: 8
  },
  sendIconBtn: {
    backgroundColor: '#2D5A27',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
