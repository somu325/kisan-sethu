import type { FC, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Language, NavigationTab } from '../types';
import { translations } from '../data/i18n';
import {
  Home,
  Truck,
  TrendingUp,
  CloudSun,
  Leaf,
  FlaskConical,
  TestTube2,
  Landmark,
  Warehouse,
  PhoneCall,
  BarChart3,
  MapPin
} from 'lucide-react';

interface DesktopSidebarProps {
  currentLang: Language;
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenHelpline: (num: string) => void;
}

export const DesktopSidebar: FC<DesktopSidebarProps> = ({
  currentLang,
  activeTab,
  onSelectTab,
  onOpenHelpline
}) => {
  const t = translations[currentLang];

  const menuItems: { id: NavigationTab; label: string; icon: ReactNode; badge?: string }[] = [
    { id: 'home', label: t.tabHome, icon: <Home size={18} /> },
    {
      id: 'markets',
      label: currentLang === 'hi' ? 'निकटतम मंडियां (Map)' : currentLang === 'te' ? 'సమీప మార్కెట్లు (Map)' : 'Nearby Markets',
      icon: <MapPin size={18} />,
      badge: 'OSM'
    },
    { id: 'charts', label: t.tabCharts, icon: <BarChart3 size={18} />, badge: 'Guide' },
    { id: 'logistics', label: t.tabLogistics, icon: <Truck size={18} />, badge: 'ROI' },
    { id: 'rates', label: t.tabRates, icon: <TrendingUp size={18} />, badge: 'Live' },
    { id: 'climate', label: t.tabClimate, icon: <CloudSun size={18} /> },
    { id: 'advisory', label: t.tabAdvisory, icon: <Leaf size={18} /> },
    { id: 'pesticides', label: t.tabPesticides, icon: <FlaskConical size={18} /> },
    { id: 'soildoctor', label: t.tabSoilDoctor, icon: <TestTube2 size={18} /> },
    { id: 'schemes', label: t.tabSchemes, icon: <Landmark size={18} /> },
    { id: 'storage', label: t.tabStorage, icon: <Warehouse size={18} /> }
  ];

  return (
    <View style={styles.sidebar}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {currentLang === 'hi'
            ? 'कृषि सेवाएं (Agri Modules)'
            : currentLang === 'te'
            ? 'సేవలు (Services)'
            : 'Agri Command Center'}
        </Text>
      </View>

      <View style={styles.navList}>
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onSelectTab(item.id)}
              style={[styles.navItem, isActive && styles.navItemActive]}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrap}>
                {item.icon}
              </View>
              <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]}>
                {item.label}
              </Text>
              {item.badge && (
                <View style={[styles.badge, isActive && styles.badgeActive]}>
                  <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                    {item.badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.helplineBox}>
        <View style={styles.helplineTitleRow}>
          <PhoneCall size={14} color="#2D5A27" />
          <Text style={styles.helplineTitle}>{t.kisanCallCenter}</Text>
        </View>
        <Text style={styles.helplineSub}>1551 ({t.tollFreeTag})</Text>
        <TouchableOpacity
          onPress={() => onOpenHelpline('1551')}
          style={styles.callBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.callBtnText}>{t.freeCallBtn}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    padding: 16,
    flexDirection: 'column',
    justifyContent: 'space-between',
    flexShrink: 0,
    overflow: 'scroll',
  },
  header: {
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  navList: {
    gap: 4,
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: '#EFF7EE',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  itemLabelActive: {
    color: '#2D5A27',
    fontWeight: '800',
  },
  badge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  badgeActive: {
    backgroundColor: '#2D5A27',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  helplineBox: {
    marginTop: 16,
    backgroundColor: '#F0F9ED',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D2EBD0',
  },
  helplineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  helplineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3F1A',
  },
  helplineSub: {
    fontSize: 11,
    color: '#4B7746',
    marginBottom: 8,
  },
  callBtn: {
    backgroundColor: '#2D5A27',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
