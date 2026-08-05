import { useCallback, useRef, useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import PagerView from "react-native-pager-view";
import PageDots from "./src/components/PageDots";
import { SearchProvider } from "./src/context/SearchContext";
import FeaturedScreen from "./src/screens/FeaturedScreen";
import FeedScreen from "./src/screens/FeedScreen";
import SavedSearchesScreen from "./src/screens/SavedSearchesScreen";
import SearchScreen from "./src/screens/SearchScreen";
import { colors } from "./src/theme";

export default function App() {
  const pagerRef = useRef<PagerView>(null);
  const [index, setIndex] = useState(0);

  const goToSearch = useCallback(() => {
    pagerRef.current?.setPage(2);
  }, []);

  return (
    <SearchProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />

        <PagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={0}
          onPageSelected={(e) => setIndex(e.nativeEvent.position)}
        >
          <View key="feed" style={styles.page}>
            <FeedScreen />
          </View>
          <View key="featured" style={styles.page}>
            <FeaturedScreen />
          </View>
          <View key="search" style={styles.page}>
            <SearchScreen />
          </View>
          <View key="saved" style={styles.page}>
            <SavedSearchesScreen onOpenSearch={goToSearch} />
          </View>
        </PagerView>

        <PageDots count={4} index={index} />
      </SafeAreaView>
    </SearchProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
});
