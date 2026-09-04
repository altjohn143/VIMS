import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { themeColors } from '../utils/theme';

const AnimatedSplashScreen = ({ ready, onFinish, children }) => {
  const { width, height } = useWindowDimensions();
  const [sequenceDone, setSequenceDone] = useState(false);
  const [exiting, setExiting] = useState(false);

  const ground = useRef(new Animated.Value(0)).current;
  const foundation = useRef(new Animated.Value(0)).current;
  const walls = useRef(new Animated.Value(0)).current;
  const roof = useRef(new Animated.Value(0)).current;
  const details = useRef(new Animated.Value(0)).current;
  const community = useRef(new Animated.Value(0)).current;
  const brand = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;
  const splashExit = useRef(new Animated.Value(0)).current;
  const appReveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(ground, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(foundation, {
        toValue: 1,
        duration: 340,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.stagger(130, [
        Animated.spring(walls, {
          toValue: 1,
          friction: 8,
          tension: 55,
          useNativeDriver: true,
        }),
        Animated.spring(roof, {
          toValue: 1,
          friction: 8,
          tension: 55,
          useNativeDriver: true,
        }),
        Animated.timing(details, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(community, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(brand, {
          toValue: 1,
          duration: 470,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(shine, {
            toValue: 1,
            duration: 650,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(check, {
            toValue: 1,
            friction: 6,
            tension: 95,
            useNativeDriver: true,
          }),
          Animated.delay(360),
          Animated.timing(check, {
            toValue: 0,
            duration: 140,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(() => setSequenceDone(true));
  }, [brand, check, community, details, foundation, ground, roof, shine, walls]);

  useEffect(() => {
    if (!ready || !sequenceDone || exiting) return;

    setExiting(true);
    Animated.parallel([
      Animated.timing(appReveal, {
        toValue: 1,
        duration: 780,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(splashExit, {
        toValue: 1,
        duration: 820,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onFinish) onFinish();
    });
  }, [appReveal, exiting, onFinish, ready, sequenceDone, splashExit]);

  const sceneScale = Math.min(Math.max(width / 390, 0.86), 1.05);
  const isShort = height < 720;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.appLayer,
          {
            opacity: appReveal,
            transform: [
              {
                translateY: appReveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [36, 0],
                }),
              },
              {
                scale: appReveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.985, 1],
                }),
              },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.splashLayer,
          {
            opacity: splashExit.interpolate({
              inputRange: [0, 0.78, 1],
              outputRange: [1, 0.12, 0],
            }),
            transform: [
              {
                translateY: splashExit.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -58],
                }),
              },
              {
                scale: splashExit.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.9],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#002F05', '#006B18', '#EAF7ED']}
          locations={[0, 0.58, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.mapLineOne} />
        <View style={styles.mapLineTwo} />
        <View style={styles.mapLineThree} />
        <View style={styles.backgroundRidge} />
        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark-outline" size={18} color={themeColors.primarySoft} />
        </View>
        <Animated.View style={[styles.scene, { transform: [{ scale: sceneScale }] }]}>
          <Animated.View
            style={[
              styles.road,
              {
                opacity: community,
                transform: [
                  {
                    scaleX: community.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.01, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.roadDash} />
            <View style={[styles.roadDash, styles.roadDashSecond]} />
          </Animated.View>

          <Animated.View
            style={[
              styles.ground,
              {
                opacity: ground,
                transform: [
                  {
                    scaleX: ground.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.01, 1],
                    }),
                  },
                ],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.foundation,
              {
                opacity: foundation,
                transform: [
                  {
                    scaleX: foundation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.01, 1],
                    }),
                  },
                ],
              },
            ]}
          />

          <SmallHouse progress={community} side="left" />
          <SmallHouse progress={community} side="right" />
          <SmallHouse progress={community} side="farLeft" />
          <Tree progress={community} style={styles.leftTree} />
          <Tree progress={community} style={styles.rightTree} />
          <Tree progress={community} style={styles.centerTree} />
          <StreetLight progress={community} />

          <Animated.View
            style={[
              styles.mainHouse,
              {
                opacity: walls,
                transform: [
                  {
                    translateY: walls.interpolate({
                      inputRange: [0, 1],
                      outputRange: [24, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.wallShape} />
          </Animated.View>

          <Animated.View
            style={[
              styles.roof,
              {
                opacity: roof,
                transform: [
                  {
                    translateY: roof.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-24, 0],
                    }),
                  },
                  {
                    scale: roof.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.86, 1],
                    }),
                  },
                  { rotate: '45deg' },
                ],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.chimney,
              {
                opacity: details,
                transform: [
                  {
                    translateY: details.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.houseDetails,
              {
                opacity: details,
                transform: [
                  {
                    scale: details.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.85, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.window} />
            <View style={styles.door} />
            <View style={styles.window} />
          </Animated.View>

          <Animated.View
            style={[
              styles.shine,
              {
                opacity: shine.interpolate({
                  inputRange: [0, 0.2, 0.72, 1],
                  outputRange: [0, 0.45, 0.45, 0],
                }),
                transform: [
                  {
                    translateX: shine.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-160, 170],
                    }),
                  },
                  { rotate: '14deg' },
                ],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.checkBadge,
              {
                opacity: check,
                transform: [
                  {
                    scale: check.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.72, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="checkmark" size={22} color={themeColors.white} />
          </Animated.View>
        </Animated.View>

        <Animated.View
          style={[
            styles.brandBlock,
            isShort && styles.brandBlockShort,
            {
              opacity: brand,
              transform: [
                {
                  translateY: brand.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.brandTitle}>WESTVILLE CASIMIRO HOMES</Text>
          <Text style={styles.brandSubtitle}>Village Information Management System</Text>
          <Text style={styles.brandTagline}>Building a better connected community.</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const SmallHouse = ({ progress, side }) => {
  const isLeft = side === 'left';
  const isFarLeft = side === 'farLeft';

  return (
    <Animated.View
      style={[
        styles.smallHouse,
        isFarLeft ? styles.smallHouseFarLeft : isLeft ? styles.smallHouseLeft : styles.smallHouseRight,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.86, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.smallRoof} />
      <View style={styles.smallWall}>
        <View style={styles.smallDoor} />
      </View>
    </Animated.View>
  );
};

const Tree = ({ progress, style }) => (
  <Animated.View
    style={[
      styles.tree,
      style,
      {
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [14, 0],
            }),
          },
        ],
      },
    ]}
  >
    <View style={styles.treeTop} />
    <View style={styles.treeTrunk} />
  </Animated.View>
);

const StreetLight = ({ progress }) => (
  <Animated.View
    style={[
      styles.streetLight,
      {
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
      },
    ]}
  >
    <View style={styles.lightPole} />
    <View style={styles.lightGlow} />
  </Animated.View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  appLayer: {
    flex: 1,
  },
  splashLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primaryDark,
    paddingHorizontal: 24,
  },
  mapLineOne: {
    position: 'absolute',
    top: 92,
    left: -38,
    width: 230,
    height: 230,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(217,251,234,0.16)',
    transform: [{ rotate: '32deg' }],
  },
  mapLineTwo: {
    position: 'absolute',
    top: 144,
    right: -76,
    width: 270,
    height: 270,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    transform: [{ rotate: '-24deg' }],
  },
  mapLineThree: {
    position: 'absolute',
    bottom: 96,
    left: 36,
    right: 36,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  backgroundRidge: {
    position: 'absolute',
    left: -40,
    right: -40,
    bottom: -36,
    height: 190,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  securityBadge: {
    position: 'absolute',
    top: 58,
    right: 28,
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(217,251,234,0.28)',
    backgroundColor: 'rgba(0,47,5,0.36)',
  },
  scene: {
    width: 340,
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ground: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 165,
    height: 4,
    borderRadius: 2,
    backgroundColor: themeColors.primarySoft,
  },
  road: {
    position: 'absolute',
    left: 52,
    right: 52,
    top: 178,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,47,5,0.32)',
    overflow: 'hidden',
  },
  roadDash: {
    position: 'absolute',
    top: 12,
    left: 74,
    width: 34,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  roadDashSecond: {
    left: 156,
  },
  foundation: {
    position: 'absolute',
    top: 143,
    width: 138,
    height: 8,
    borderRadius: 4,
    backgroundColor: themeColors.primaryDark,
  },
  mainHouse: {
    position: 'absolute',
    top: 78,
    width: 116,
    height: 68,
    borderWidth: 4,
    borderColor: themeColors.primaryDark,
    borderRadius: 8,
    backgroundColor: '#F8FFF9',
  },
  wallShape: {
    flex: 1,
    backgroundColor: '#F8FFF9',
    borderRadius: 5,
  },
  roof: {
    position: 'absolute',
    top: 39,
    width: 84,
    height: 84,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: themeColors.primaryDark,
    backgroundColor: themeColors.primarySoft,
    borderTopLeftRadius: 8,
  },
  chimney: {
    position: 'absolute',
    top: 43,
    right: 109,
    width: 17,
    height: 30,
    borderWidth: 3,
    borderColor: themeColors.primaryDark,
    borderRadius: 4,
    backgroundColor: '#F8FFF9',
  },
  houseDetails: {
    position: 'absolute',
    top: 100,
    width: 92,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  window: {
    width: 23,
    height: 21,
    borderRadius: 5,
    borderWidth: 3,
    borderColor: themeColors.primary,
    backgroundColor: themeColors.primaryWash,
  },
  door: {
    width: 26,
    height: 44,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderWidth: 3,
    borderColor: themeColors.primaryDark,
    backgroundColor: themeColors.primarySoft,
  },
  smallHouse: {
    position: 'absolute',
    top: 112,
    alignItems: 'center',
  },
  smallHouseLeft: {
    left: 43,
  },
  smallHouseFarLeft: {
    left: 91,
    top: 124,
    transform: [{ scale: 0.78 }],
  },
  smallHouseRight: {
    right: 39,
  },
  smallRoof: {
    width: 42,
    height: 42,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderColor: themeColors.primaryDark,
    backgroundColor: themeColors.primarySoft,
    borderTopLeftRadius: 6,
    transform: [{ rotate: '45deg' }],
    marginBottom: -20,
  },
  smallWall: {
    width: 52,
    height: 34,
    borderRadius: 5,
    borderWidth: 3,
    borderColor: themeColors.primaryDark,
    backgroundColor: '#F8FFF9',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  smallDoor: {
    width: 13,
    height: 19,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: themeColors.primarySoft,
  },
  tree: {
    position: 'absolute',
    top: 128,
    alignItems: 'center',
  },
  leftTree: {
    left: 18,
  },
  rightTree: {
    right: 14,
    top: 124,
  },
  centerTree: {
    right: 96,
    top: 139,
  },
  treeTop: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: themeColors.primarySoft,
    backgroundColor: '#F8FFF9',
  },
  treeTrunk: {
    width: 5,
    height: 25,
    borderRadius: 3,
    backgroundColor: themeColors.primaryDark,
    marginTop: -2,
  },
  streetLight: {
    position: 'absolute',
    top: 128,
    alignItems: 'center',
  },
  lightPole: {
    width: 4,
    height: 35,
    borderRadius: 2,
    backgroundColor: '#AAB8AF',
  },
  lightGlow: {
    position: 'absolute',
    top: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: themeColors.primarySoft,
    opacity: 0.75,
  },
  shine: {
    position: 'absolute',
    top: 22,
    width: 48,
    height: 185,
    borderRadius: 24,
    backgroundColor: themeColors.primarySoft,
  },
  checkBadge: {
    position: 'absolute',
    right: 30,
    bottom: 38,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary,
  },
  brandBlock: {
    alignItems: 'center',
    marginTop: 2,
  },
  brandBlockShort: {
    marginTop: -8,
  },
  brandTitle: {
    color: themeColors.white,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  brandSubtitle: {
    marginTop: 7,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  brandTagline: {
    marginTop: 7,
    color: 'rgba(217,251,234,0.86)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default AnimatedSplashScreen;
